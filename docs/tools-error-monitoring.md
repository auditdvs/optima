# Tools Error Monitoring Integration

## Setup N8N Webhook untuk Notifikasi Telegram

### 1. Database Trigger di Supabase

Buat function dan trigger di Supabase untuk mengirim webhook ke N8N ketika ada error baru:

```sql
-- Function untuk mengirim webhook ke N8N
CREATE OR REPLACE FUNCTION notify_tools_error()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url TEXT := 'https://your-n8n-instance.com/webhook/tools-error';
  payload JSON;
BEGIN
  -- Hanya kirim notifikasi untuk error baru (bukan resolved)
  IF NEW.is_resolved = FALSE AND OLD IS NULL THEN
    payload := json_build_object(
      'tool_name', NEW.tool_name,
      'tool_url', NEW.tool_url,
      'error_type', NEW.error_type,
      'error_message', NEW.error_message,
      'response_time', NEW.response_time,
      'checked_at', NEW.checked_at
    );

    -- Kirim HTTP request ke N8N webhook
    PERFORM net.http_post(
      webhook_url,
      payload::text,
      'application/json'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger untuk tools_errors table
CREATE TRIGGER trigger_notify_tools_error
  AFTER INSERT ON tools_errors
  FOR EACH ROW
  EXECUTE FUNCTION notify_tools_error();
```

### 2. N8N Workflow Configuration

Buat workflow di N8N dengan nodes berikut:

#### Node 1: Webhook Trigger

- **Name**: Tools Error Webhook
- **Method**: POST
- **Path**: `/tools-error`
- **Response Mode**: Immediately

#### Node 2: Function Node (Data Processing)

```javascript
// Format message untuk Telegram
const data = $input.first().json;

const message = `🚨 *Tools Error Alert*

📱 *Tool Name:* ${data.tool_name}
🔗 *URL:* ${data.tool_url}
⚠️ *Error Type:* ${data.error_type}
💬 *Message:* ${data.error_message || "No message"}
⏱️ *Response Time:* ${data.response_time ? data.response_time + "ms" : "N/A"}
🕐 *Time:* ${new Date(data.checked_at).toLocaleString("id-ID")}

#ToolsError #Monitoring`;

return {
  json: {
    message: message,
    parse_mode: "Markdown",
  },
};
```

#### Node 3: Telegram Node

- **Name**: Send Telegram Notification
- **Operation**: Send Message
- **Chat ID**: Your Telegram Chat ID or Group ID
- **Text**: `{{ $json.message }}`
- **Parse Mode**: `{{ $json.parse_mode }}`

### 3. Setup Telegram Bot

1. **Create Bot**:

   - Chat dengan @BotFather di Telegram
   - Gunakan command `/newbot`
   - Dapatkan Bot Token

2. **Get Chat ID**:

   - Kirim message ke bot
   - Akses `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Copy chat ID dari response

3. **Add Bot to Group** (Optional):
   - Tambahkan bot ke grup
   - Jadikan bot sebagai admin
   - Gunakan group chat ID (negative number)

### 4. Environment Variables

Tambahkan di N8N environment:

```
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
```

### 5. Testing

Test webhook dengan curl:

```bash
curl -X POST https://your-n8n-instance.com/webhook/tools-error \
  -H "Content-Type: application/json" \
  -d '{
    "tool_name": "Test Tool",
    "tool_url": "https://test.streamlit.app",
    "error_type": "connection_error",
    "error_message": "Connection timeout",
    "response_time": 5000,
    "checked_at": "2025-08-21T10:30:00Z"
  }'
```

### 6. Advanced Features

#### Scheduled Health Checks

Tambahkan node Schedule Trigger untuk pengecekan berkala:

- **Interval**: Setiap 15 menit
- **HTTP Request**: Check semua tools
- **Condition**: Jika ada error, kirim ke Telegram

#### Error Grouping

Hindari spam dengan grouping error yang sama:

- Simpan error terakhir di N8N memory
- Kirim notifikasi hanya jika error type berbeda atau > 1 jam

#### Recovery Notifications

Kirim notifikasi ketika tools kembali online:

```javascript
// Function node untuk recovery check
if (data.is_resolved === true) {
  const message = `✅ *Tools Recovery*

📱 *Tool Name:* ${data.tool_name}
🔗 *URL:* ${data.tool_url}
✅ *Status:* Back Online
🕐 *Resolved At:* ${new Date(data.resolved_at).toLocaleString("id-ID")}

#ToolsRecovery #Monitoring`;

  return { json: { message, parse_mode: "Markdown" } };
}
```

### 7. Security Considerations

- Gunakan HTTPS untuk webhook
- Validate incoming data
- Rate limiting untuk mencegah spam
- Gunakan secret token untuk webhook validation

### 8. Monitoring Dashboard

Buat dashboard sederhana untuk monitoring:

- Total errors per day
- Tools dengan error terbanyak
- Average response time
- Uptime percentage

Ini akan memberikan visibilitas lengkap terhadap kesehatan semua tools eksternal.
