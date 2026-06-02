// Azure infrastructure for Repohistory
// Resources: Container Registry, PostgreSQL container (Azure Files), Container Apps Environment + App, Log Analytics, Managed Identity
// Estimated cost: ~$10-15/mo  (ACR Basic ~$5 + Azure Files ~$1 + Container Apps consumption ~$2-7 + Log Analytics ~$2)
// Note: Uses postgres:16-alpine container instead of Flexible Server to avoid subscription quota restrictions.

param location string = 'eastus'
param appName string = 'repohistory'
param postgresAdminUser string = 'repohistoryadmin'

@secure()
param postgresAdminPassword string

@secure()
param githubClientId string

@secure()
param githubClientSecret string

@secure()
param authSecret string

@secure()
param appId string

@secure()
param appPrivateKey string

// Set to placeholder on first deploy; update once FQDN is known
param siteUrl string = 'https://placeholder.azurecontainerapps.io'

// ── Managed Identity (used by Container App to pull images from ACR) ──────────
resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${appName}-identity'
  location: location
}

// ── Container Registry ────────────────────────────────────────────────────────
resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: '${replace(appName, '-', '')}acr'
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    // Admin disabled — image pull uses managed identity (AcrPull role below)
    adminUserEnabled: false
  }
}

// ── AcrPull role: managed identity → ACR ─────────────────────────────────────
// Allows the Container App to pull images without admin credentials
var acrPullRoleId = '7f951dda-4ed3-4680-a7ca-43fe172d538d' // AcrPull built-in

resource acrPullRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(acr.id, identity.id, acrPullRoleId)
  scope: acr
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPullRoleId)
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// ── Storage Account + Azure Files (PostgreSQL data persistence) ──────────────
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: '${replace(appName, '-', '')}pgdata'
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}

resource filesShare 'Microsoft.Storage/storageAccounts/fileServices/shares@2023-01-01' = {
  name: '${storageAccount.name}/default/postgres-data'
  properties: { shareQuota: 5 }
}

// ── Log Analytics ─────────────────────────────────────────────────────────────
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${appName}-logs'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// ── Container Apps Environment ────────────────────────────────────────────────
// caEnv must be declared before caStorage (which is a child resource)
resource caEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: '${appName}-env'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// ── PostgreSQL container (internal TCP, single replica, ephemeral storage) ──
// Note: Azure Files (SMB) does not support chmod — postgres cannot init.
// Using ephemeral container storage instead. Data persists across restarts
// but not across container replacement/redeployment.
resource postgresApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'postgres'
  location: location
  properties: {
    environmentId: caEnv.id
    configuration: {
      ingress: {
        external: false
        transport: 'tcp'
        targetPort: 5432
        exposedPort: 5432
      }
      secrets: [
        { name: 'postgres-password', value: postgresAdminPassword }
      ]
    }
    template: {
      containers: [
        {
          name: 'postgres'
          image: 'postgres:16-alpine'
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            { name: 'POSTGRES_DB', value: 'repohistory' }
            { name: 'POSTGRES_USER', value: postgresAdminUser }
            { name: 'POSTGRES_PASSWORD', secretRef: 'postgres-password' }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 1
      }
    }
  }
}

// ── Container App ─────────────────────────────────────────────────────────────
// postgres app name is its internal DNS hostname within the same CA environment
var databaseUrl = 'postgres://${postgresAdminUser}:${postgresAdminPassword}@postgres:5432/repohistory'

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: appName
  location: location
  // Attach managed identity so Container Apps runtime can pull from ACR
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${identity.id}': {}
    }
  }
  properties: {
    environmentId: caEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'http'
        allowInsecure: false
      }
      // Use managed identity for image pull — no admin password needed
      registries: [
        {
          server: acr.properties.loginServer
          identity: identity.id
        }
      ]
      secrets: [
        { name: 'database-url', value: databaseUrl }
        { name: 'auth-secret', value: authSecret }
        { name: 'github-client-id', value: githubClientId }
        { name: 'github-client-secret', value: githubClientSecret }
        { name: 'app-id', value: empty(appId) ? 'not-configured' : appId }
        { name: 'app-private-key', value: empty(appPrivateKey) ? 'not-configured' : appPrivateKey }
      ]
    }
    template: {
      containers: [
        {
          name: appName
          image: '${acr.properties.loginServer}/${appName}:latest'
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            { name: 'DATABASE_URL', secretRef: 'database-url' }
            { name: 'DATABASE_SSL', value: 'false' }
            { name: 'NEXTAUTH_SECRET', secretRef: 'auth-secret' }
            { name: 'AUTH_SECRET', secretRef: 'auth-secret' }
            { name: 'GITHUB_CLIENT_ID', secretRef: 'github-client-id' }
            { name: 'GITHUB_CLIENT_SECRET', secretRef: 'github-client-secret' }
            { name: 'APP_ID', secretRef: 'app-id' }
            { name: 'APP_PRIVATE_KEY', secretRef: 'app-private-key' }
            { name: 'NEXTAUTH_URL', value: siteUrl }
            { name: 'NEXT_PUBLIC_SITE_URL', value: siteUrl }
            { name: 'NODE_ENV', value: 'production' }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 3
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '20'
              }
            }
          }
        ]
      }
    }
  }
  // Role assignment must exist before Container App tries to pull from ACR
  // postgres must be running before the web app starts
  dependsOn: [acrPullRole, postgresApp]
}

// ── Outputs ───────────────────────────────────────────────────────────────────
output containerAppFqdn string = containerApp.properties.configuration.ingress.fqdn
output acrLoginServer string = acr.properties.loginServer
output postgresInternalHost string = 'postgres'
output identityClientId string = identity.properties.clientId
