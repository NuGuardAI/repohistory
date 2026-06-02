// Azure infrastructure for Repohistory
// Resources: Container Registry, PostgreSQL Flexible Server, Container Apps Environment + App, Log Analytics, Managed Identity
// Estimated cost: ~$19-24/mo  (ACR Basic ~$5 + PostgreSQL B1ms ~$12 + Container Apps consumption ~$0-5 + Log Analytics ~$2)

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

// ── PostgreSQL Flexible Server ────────────────────────────────────────────────
resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2023-06-01-preview' = {
  name: '${appName}-postgres'
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    administratorLogin: postgresAdminUser
    administratorLoginPassword: postgresAdminPassword
    storage: {
      storageSizeGB: 32
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    version: '16'
    highAvailability: {
      mode: 'Disabled'
    }
  }
}

resource postgresDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-06-01-preview' = {
  parent: postgres
  name: 'repohistory'
}

// Allow all Azure-internal traffic (covers Container Apps egress)
resource postgresFirewallAllowAzure 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-06-01-preview' = {
  parent: postgres
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
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

// ── Container App ─────────────────────────────────────────────────────────────
var databaseUrl = 'postgres://${postgresAdminUser}:${postgresAdminPassword}@${postgres.properties.fullyQualifiedDomainName}:5432/repohistory?sslmode=require'

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
        { name: 'app-id', value: appId }
        { name: 'app-private-key', value: appPrivateKey }
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
  dependsOn: [acrPullRole]
}

// ── Outputs ───────────────────────────────────────────────────────────────────
output containerAppFqdn string = containerApp.properties.configuration.ingress.fqdn
output acrLoginServer string = acr.properties.loginServer
output postgresHost string = postgres.properties.fullyQualifiedDomainName
output identityClientId string = identity.properties.clientId
