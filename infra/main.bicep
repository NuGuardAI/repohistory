// Azure infrastructure for Repohistory
// Resources: Container Registry, Azure PostgreSQL Flexible Server, Container Apps Environment + App, Log Analytics, Managed Identity
// Estimated cost: ~$15-25/mo  (ACR Basic ~$5 + PostgreSQL Flexible Burstable B1ms ~$12 + Container Apps consumption ~$2-7 + Log Analytics ~$2)

param location string = 'eastus'
param pgLocation string = 'centralus' // Flexible Server not available in eastus; use centralus
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

// Local auth: comma-separated GitHub logins that are admins (e.g. 'alice,bob')
param adminGithubLogins string = ''

// Local auth: GitHub token used by local (username/password) users for API calls
@secure()
param localAuthGithubToken string = ''

// Optional: Cloudflare + Google Analytics 4 credentials for nuguard.ai analytics.
// Leave empty on first deploy; set once credentials are available.
@secure()
param cloudflareApiToken string = ''

@secure()
param cloudflareZoneId string = ''

@secure()
param ga4PropertyId string = ''

@secure()
param ga4ServiceAccountJson string = ''

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

// ── Storage Account + Azure Files (kept for future use / backups) ───────────
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

// ── Azure PostgreSQL Flexible Server ─────────────────────────────────────────
// Fully-managed, persists data independently of Container App deployments.
// Burstable B1ms: 1 vCore, 2 GiB RAM — sufficient for this workload at ~$12/mo.
resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2022-12-01' = {
  name: '${appName}-pg'
  location: pgLocation
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: postgresAdminUser
    administratorLoginPassword: postgresAdminPassword
    storage: {
      storageSizeGB: 32
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
    // Public access disabled — only accessible within the same VNet/environment
    // For Container Apps without VNet integration, use public access with firewall rules
    network: {
      publicNetworkAccess: 'Enabled'
    }
  }
}

// Allow Azure services (including Container Apps) to connect
resource postgresFirewallAzure 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2022-12-01' = {
  parent: postgresServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource postgresDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2022-12-01' = {
  parent: postgresServer
  name: 'repohistory'
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
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

// ── Container App ─────────────────────────────────────────────────────────────
// Connects to Azure PostgreSQL Flexible Server over TLS (sslmode=require)
var databaseUrl = 'postgres://${postgresAdminUser}:${postgresAdminPassword}@${postgresServer.properties.fullyQualifiedDomainName}:5432/repohistory?sslmode=require'

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
        { name: 'local-auth-github-token', value: empty(localAuthGithubToken) ? 'not-configured' : localAuthGithubToken }
        { name: 'cloudflare-api-token', value: cloudflareApiToken }
        { name: 'cloudflare-zone-id', value: cloudflareZoneId }
        { name: 'ga4-property-id', value: ga4PropertyId }
        { name: 'ga4-service-account-json', value: ga4ServiceAccountJson }
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
            { name: 'DATABASE_SSL', value: 'true' }
            { name: 'NEXTAUTH_SECRET', secretRef: 'auth-secret' }
            { name: 'AUTH_SECRET', secretRef: 'auth-secret' }
            { name: 'GITHUB_CLIENT_ID', secretRef: 'github-client-id' }
            { name: 'GITHUB_CLIENT_SECRET', secretRef: 'github-client-secret' }
            { name: 'APP_ID', secretRef: 'app-id' }
            { name: 'APP_PRIVATE_KEY', secretRef: 'app-private-key' }
            { name: 'ADMIN_GITHUB_LOGINS', value: adminGithubLogins }
            { name: 'LOCAL_AUTH_GITHUB_TOKEN', secretRef: 'local-auth-github-token' }
            { name: 'CLOUDFLARE_API_TOKEN', secretRef: 'cloudflare-api-token' }
            { name: 'CLOUDFLARE_ZONE_ID', secretRef: 'cloudflare-zone-id' }
            { name: 'GA4_PROPERTY_ID', secretRef: 'ga4-property-id' }
            { name: 'GA4_SERVICE_ACCOUNT_JSON', secretRef: 'ga4-service-account-json' }
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
  dependsOn: [acrPullRole, postgresDb]
}

// ── Outputs ───────────────────────────────────────────────────────────────────
output containerAppFqdn string = containerApp.properties.configuration.ingress.fqdn
output acrLoginServer string = acr.properties.loginServer
output postgresHost string = postgresServer.properties.fullyQualifiedDomainName
output identityClientId string = identity.properties.clientId
