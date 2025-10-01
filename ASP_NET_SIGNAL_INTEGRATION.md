# ASP.NET Signal Integration Guide

## 🎯 Integration Overview

Your ASP.NET Backend API already filters and sends signals to Telegram every 5 minutes. Now you just need to add **ONE additional method call** to also send signals to your iOS app.

---

## 📊 Your Current Flow

```
Every 5 minutes:
Background Job → Fetch Instruments → AI Server → Process Signals
         ↓
Backend API Filters Duplicates
         ↓
   POST to Telegram Bot ✅ (Existing)
```

## 📲 New Flow (Add This)

```
Every 5 minutes:
Background Job → Fetch Instruments → AI Server → Process Signals
         ↓
Backend API Filters Duplicates
         ↓
   ┌───────┴────────┐
   ↓                ↓
Telegram Bot     iOS App Backend  ✨ (NEW)
                     ↓
                 WebSocket
                     ↓
                 iOS Users
```

---

## 🔧 Implementation (ASP.NET C#)

### **Step 1: Add Configuration (appsettings.json)**

```json
{
  "SignalIntegration": {
    "iOSAppBackendUrl": "http://localhost:5001/api/signals/ingest",
    "ApiKey": "your-secure-api-key-change-in-production",
    "Enabled": true,
    "TimeoutSeconds": 10
  }
}
```

**For Production:**
```json
{
  "SignalIntegration": {
    "iOSAppBackendUrl": "https://your-nodejs-backend.railway.app/api/signals/ingest",
    "ApiKey": "GENERATE_SECURE_KEY_HERE",
    "Enabled": true,
    "TimeoutSeconds": 10
  }
}
```

---

### **Step 2: Create Signal Model (if not exists)**

```csharp
// Models/SignalDto.cs
public class SignalDto
{
    public string Pair { get; set; }           // e.g., "EUR/USD"
    public string Action { get; set; }         // "BUY" or "SELL"
    public decimal Entry { get; set; }         // 1.0850
    public decimal StopLoss { get; set; }      // 1.0820
    public decimal TakeProfit { get; set; }    // 1.0920
    public int? Confidence { get; set; }       // 85
    public decimal? Risk { get; set; }         // 2.5
    public string Reasoning { get; set; }      // Strategy explanation
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string Source { get; set; } = "RiskCompass";
}
```

---

### **Step 3: Create iOS App Service**

```csharp
// Services/iOSSignalService.cs
using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

public interface IiOSSignalService
{
    Task<bool> SendSignalToiOSApp(SignalDto signal);
}

public class iOSSignalService : IiOSSignalService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<iOSSignalService> _logger;
    private readonly string _backendUrl;
    private readonly string _apiKey;
    private readonly bool _enabled;

    public iOSSignalService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<iOSSignalService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;

        _backendUrl = configuration["SignalIntegration:iOSAppBackendUrl"];
        _apiKey = configuration["SignalIntegration:ApiKey"];
        _enabled = configuration.GetValue<bool>("SignalIntegration:Enabled", true);

        var timeout = configuration.GetValue<int>("SignalIntegration:TimeoutSeconds", 10);
        _httpClient.Timeout = TimeSpan.FromSeconds(timeout);
    }

    public async Task<bool> SendSignalToiOSApp(SignalDto signal)
    {
        if (!_enabled)
        {
            _logger.LogInformation("iOS signal integration is disabled");
            return true; // Don't block if disabled
        }

        try
        {
            // Create request payload
            var payload = new
            {
                pair = signal.Pair,
                action = signal.Action,
                entry = signal.Entry,
                stopLoss = signal.StopLoss,
                takeProfit = signal.TakeProfit,
                confidence = signal.Confidence,
                risk = signal.Risk,
                reasoning = signal.Reasoning,
                timestamp = signal.Timestamp.ToString("o"),
                source = signal.Source
            };

            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            // Add authorization header
            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {_apiKey}");

            // Send POST request
            var response = await _httpClient.PostAsync(_backendUrl, content);

            if (response.IsSuccessStatusCode)
            {
                var responseBody = await response.Content.ReadAsStringAsync();
                _logger.LogInformation(
                    "Successfully sent signal to iOS app: {Action} {Pair}",
                    signal.Action,
                    signal.Pair
                );
                return true;
            }
            else
            {
                _logger.LogError(
                    "Failed to send signal to iOS app. Status: {StatusCode}, Response: {Response}",
                    response.StatusCode,
                    await response.Content.ReadAsStringAsync()
                );
                return false;
            }
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "HTTP error sending signal to iOS app: {Message}", ex.Message);
            return false;
        }
        catch (TaskCanceledException ex)
        {
            _logger.LogError(ex, "Timeout sending signal to iOS app");
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error sending signal to iOS app: {Message}", ex.Message);
            return false;
        }
    }
}
```

---

### **Step 4: Register Service in Startup.cs or Program.cs**

**For .NET 6+ (Program.cs):**
```csharp
// Program.cs
builder.Services.AddHttpClient<IiOSSignalService, iOSSignalService>();
```

**For .NET 5 and earlier (Startup.cs):**
```csharp
// Startup.cs
public void ConfigureServices(IServiceCollection services)
{
    services.AddHttpClient<IiOSSignalService, iOSSignalService>();
    // ... other services
}
```

---

### **Step 5: Update Your Signal Distribution Logic**

**Find your existing signal distribution method** (where you send to Telegram) and add the iOS call:

```csharp
// Your existing signal processing class
public class SignalProcessor
{
    private readonly ITelegramBotService _telegramService;
    private readonly IiOSSignalService _iOSSignalService; // NEW
    private readonly ILogger<SignalProcessor> _logger;

    public SignalProcessor(
        ITelegramBotService telegramService,
        IiOSSignalService iOSSignalService, // NEW
        ILogger<SignalProcessor> logger)
    {
        _telegramService = telegramService;
        _iOSSignalService = iOSSignalService; // NEW
        _logger = logger;
    }

    public async Task ProcessAndDistributeSignal(SignalDto signal)
    {
        try
        {
            _logger.LogInformation("Processing signal: {Action} {Pair}", signal.Action, signal.Pair);

            // EXISTING: Send to Telegram
            await _telegramService.SendSignalMessage(signal);

            // NEW: Also send to iOS app (parallel, non-blocking)
            _ = Task.Run(async () =>
            {
                try
                {
                    await _iOSSignalService.SendSignalToiOSApp(signal);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error sending to iOS app (non-blocking)");
                }
            });

            _logger.LogInformation("Signal distributed successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing signal");
            throw;
        }
    }
}
```

**Alternative (Await Both):**
```csharp
public async Task ProcessAndDistributeSignal(SignalDto signal)
{
    // Send to both in parallel
    var telegramTask = _telegramService.SendSignalMessage(signal);
    var iOSTask = _iOSSignalService.SendSignalToiOSApp(signal);

    // Wait for both (or just Telegram if you want iOS to be truly fire-and-forget)
    await Task.WhenAll(telegramTask, iOSTask);
}
```

---

## 🧪 Testing

### **Test 1: Send Test Signal**

```csharp
// Create a test endpoint (optional)
[HttpPost("api/signals/test")]
public async Task<IActionResult> TestiOSSignal()
{
    var testSignal = new SignalDto
    {
        Pair = "EUR/USD",
        Action = "BUY",
        Entry = 1.0850m,
        StopLoss = 1.0820m,
        TakeProfit = 1.0920m,
        Confidence = 85,
        Risk = 2.5m,
        Reasoning = "Test signal from ASP.NET"
    };

    var result = await _iOSSignalService.SendSignalToiOSApp(testSignal);

    return Ok(new
    {
        success = result,
        message = result ? "Test signal sent successfully" : "Failed to send test signal"
    });
}
```

### **Test 2: Using Postman or curl**

```bash
curl -X POST https://your-aspnet-api.com/api/signals/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

### **Test 3: Check iOS App**

1. Open your iOS app: http://localhost:5001/signals.html
2. Send test signal from ASP.NET
3. Signal should appear instantly in the iOS app
4. Check browser console for WebSocket connection logs

---

## 📋 Checklist

### **Development Environment**

- [ ] Add configuration to `appsettings.Development.json`
- [ ] Use localhost URL: `http://localhost:5001/api/signals/ingest`
- [ ] Use test API key: `your-secure-api-key-change-in-production`
- [ ] Create `iOSSignalService.cs`
- [ ] Register service in DI container
- [ ] Update signal processor to call iOS service
- [ ] Test with one signal
- [ ] Verify signal appears in iOS app

### **Production Environment**

- [ ] Add configuration to `appsettings.Production.json`
- [ ] Generate secure API key: `openssl rand -hex 32`
- [ ] Update URL to production Node.js backend
- [ ] Set `Enabled: true` in production config
- [ ] Deploy ASP.NET changes
- [ ] Test with production environment
- [ ] Monitor logs for errors
- [ ] Verify signals reach iOS users

---

## 🔐 Security Best Practices

### **1. Generate Secure API Key**

```bash
# PowerShell
[System.Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Linux/Mac
openssl rand -hex 32

# Or use online generator (from trusted source)
```

### **2. Store API Key Securely**

**Use Azure Key Vault or similar:**
```csharp
builder.Configuration.AddAzureKeyVault(
    new Uri($"https://{keyVaultName}.vault.azure.net/"),
    new DefaultAzureCredential()
);
```

**Or use User Secrets in development:**
```bash
dotnet user-secrets set "SignalIntegration:ApiKey" "your-key-here"
```

### **3. Use HTTPS in Production**

```json
{
  "SignalIntegration": {
    "iOSAppBackendUrl": "https://your-backend.com/api/signals/ingest",
    // NOT http://
  }
}
```

---

## 📊 Expected Behavior

### **Success Flow**

```
1. Background job fires (every 5 minutes)
2. AI Server returns signals
3. ASP.NET filters duplicates
4. ASP.NET sends to Telegram ✅
5. ASP.NET sends to iOS backend ✅
6. iOS backend stores in database
7. iOS backend broadcasts via WebSocket
8. iOS users see signal instantly
9. ASP.NET logs success
```

### **Failure Handling**

```
If iOS backend is down:
1. ASP.NET logs error
2. Telegram still works ✅
3. Signal is NOT lost (will retry next cycle)

If network timeout:
1. HTTP request times out after 10 seconds
2. ASP.NET logs timeout
3. Telegram still works ✅
```

---

## 🐛 Troubleshooting

### **Problem: "Connection refused"**

**Solution:**
- Check Node.js backend is running: `http://localhost:5001`
- Check firewall allows connections
- Verify URL in configuration is correct

### **Problem: "401 Unauthorized"**

**Solution:**
- Check API key matches in both systems
- Verify Authorization header format: `Bearer your-key`
- Check for extra spaces in API key

### **Problem: "Timeout"**

**Solution:**
- Increase timeout in configuration
- Check Node.js backend performance
- Verify network connectivity

### **Problem: "Signals not appearing in iOS app"**

**Solution:**
- Check WebSocket connection in browser console
- Verify signal format matches expected schema
- Check Node.js backend logs
- Refresh iOS app page

---

## 📈 Monitoring

### **Add Logging**

```csharp
_logger.LogInformation(
    "Signal distribution: Telegram={TelegramSuccess}, iOS={iOSSuccess}",
    telegramSuccess,
    iOSSuccess
);
```

### **Add Metrics (Optional)**

```csharp
// Track success rate
var signalsSent = 0;
var signalsSuccess = 0;
var signalsFailed = 0;

// Log every 100 signals
if (signalsSent % 100 == 0)
{
    _logger.LogInformation(
        "Signal statistics: Sent={Sent}, Success={Success}, Failed={Failed}, Rate={Rate:P}",
        signalsSent,
        signalsSuccess,
        signalsFailed,
        (double)signalsSuccess / signalsSent
    );
}
```

---

## 🚀 Deployment Steps

### **1. Develop and Test Locally**
```bash
1. Update ASP.NET code
2. Run ASP.NET locally
3. Run Node.js backend locally
4. Send test signal
5. Verify in iOS app
```

### **2. Deploy to Staging**
```bash
1. Deploy ASP.NET to staging
2. Deploy Node.js to staging
3. Update configuration
4. Test with staging environment
```

### **3. Deploy to Production**
```bash
1. Deploy ASP.NET to production
2. Deploy Node.js to production
3. Update production configuration
4. Monitor for 1 hour
5. Verify signals reach users
```

---

## 📞 Support

**If you encounter issues:**

1. Check ASP.NET logs for errors
2. Check Node.js backend logs: `npm start`
3. Check browser console in iOS app
4. Verify WebSocket connection status
5. Test with curl to isolate issue

**Node.js Backend Logs Location:**
```bash
# If running locally
Check terminal output

# If deployed to Railway
Check Railway dashboard logs

# If deployed to Heroku
heroku logs --tail --app your-app-name
```

---

## ✅ Quick Reference

### **URLs**

| Environment | ASP.NET Backend | iOS App Backend | iOS App Frontend |
|-------------|-----------------|-----------------|------------------|
| Development | localhost:your-port | localhost:5001 | localhost:5001 |
| Production | your-aspnet-url.com | your-nodejs-url.com | your-app.com |

### **API Endpoints**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/signals/ingest` | Receive signals from ASP.NET |
| GET | `/api/signals/active` | Get active signals |
| GET | `/api/signals/history` | Get signal history |
| POST | `/api/signals/test` | Send test signal (dev only) |

### **Configuration Keys**

```json
{
  "SignalIntegration:iOSAppBackendUrl": "backend URL",
  "SignalIntegration:ApiKey": "secure key",
  "SignalIntegration:Enabled": true/false,
  "SignalIntegration:TimeoutSeconds": 10
}
```

---

## 🎉 You're Done!

Once you've added this code to your ASP.NET backend, signals will automatically flow to your iOS app!

**Total code added:** ~150 lines
**Files modified:** 3-4 files
**Time required:** 30-45 minutes
**Complexity:** Low

---

*Last Updated: 2025-10-01*
*Status: Ready for Implementation*
