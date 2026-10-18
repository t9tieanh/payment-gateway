# Payment Gateway (sale-service)
- Phạm Tiến Anh

Payment gateway cơ bản: app gọi API tạo order → nhận link / QR thanh toán PayOS → PayOS gọi webhook → gateway đánh dấu
order đã thanh toán và chạy handler của app (mặc định: gọi callback về app).

## Công nghệ sử dụng

Node.js, TypeScript, Express, Supabase (Postgres), PayOS.

## Yêu cầu hệ thống

- Node.js >= 18.x
- Một project Supabase
- Tài khoản PayOS

## Cài đặt

1. **Cài đặt dependencies:**
   ```sh
   npm install
   ```

2. **Tạo bảng:** chạy `supabase/migrations/20261012000000_init.sql` trong SQL Editor của project Supabase.

3. **Cấu hình `.env`:**

   | Biến | Ý nghĩa |
   | --- | --- |
   | `PORT` | Cổng của service (mặc định `4000`) |
   | `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | Kết nối Supabase; secret key chỉ dùng ở server |
   | `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` | Thông tin kênh thanh toán PayOS |
   | `PAYOS_RETURN_URL`, `PAYOS_CANCEL_URL` | Trang của app mà trình duyệt quay về sau khi thanh toán / huỷ |
   | `PAYOS_WEBHOOK_URL`, `PAYOS_CONFIRM_WEBHOOK` | URL public của webhook; `true` để đăng ký URL với PayOS khi khởi động |
   | `GMAIL_USER`, `GMAIL_PASS` | Tài khoản Gmail gửi mail cảnh báo và App Password của nó (không phải mật khẩu đăng nhập) |
   | `ALERT_MAIL_TO` | Email admin của gateway nhận cảnh báo, cách nhau dấu phẩy; thiếu một trong ba biến mail thì tắt cảnh báo |
   | `APPS` | Danh sách code của các app được gắn vào, cách nhau dấu phẩy |
   | `APP_<CODE>_*` | Profile của từng app, xem bên dưới |

## Gắn một app vào gateway

Thêm code của app vào `APPS` và khai báo profile, rồi khởi động lại service. Không cần sửa code.

```
APPS=shop,learnova

APP_SHOP_API_KEY=...
APP_SHOP_HANDLER=http-callback
APP_SHOP_CALLBACK_URL=https://shop.example.com/payment/callback
APP_SHOP_CALLBACK_SECRET=...

APP_LEARNOVA_API_KEY=...
APP_LEARNOVA_HANDLER=none
```

| `HANDLER` | Việc gateway làm sau khi order được thanh toán |
| --- | --- |
| `http-callback` (mặc định) | `POST` tới `CALLBACK_URL`, body `{ orderId, referenceId, amount, status, paidAt }`, header `x-signature` = HMAC-SHA256 (hex) của body với `CALLBACK_SECRET` |
| `none` | Không làm gì; app tự gọi `GET /orders/:id` |

Service dừng ngay khi khởi động nếu một profile sai (thiếu API key, hai app trùng key, `HANDLER` không tồn tại, thiếu
callback URL / secret).

## Chạy server ở môi trường phát triển

```sh
npm run dev
```

## Các endpoint

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| POST | `/orders` | `x-api-key` | Tạo order: `{ referenceId, amount, description? }` → `{ id, status, checkoutUrl, qrCode, ... }` |
| GET | `/orders/:id` | `x-api-key` | Trạng thái order của chính app đó |
| POST | `/orders/payment/payos/webhook` | chữ ký PayOS | PayOS báo kết quả thanh toán |
| GET | `/health` | — | Health check |

## Ghi chú

- Lỗi nghiệp vụ trả HTTP 200 với mã thật nằm ở `code` trong body; chỉ lỗi validate (400) và sai API key (401) trả
  đúng HTTP status.
- Thanh toán chỉ được xác nhận qua webhook, nên `PAYOS_WEBHOOK_URL` phải gọi được từ internet.
- Khi đã nhận tiền mà xử lý không đi hết (không thấy order, lệch số tiền, app không cấu hình, handler thất bại hoặc
  crash), gateway gửi một mail cảnh báo tới `ALERT_MAIL_TO`. Webhook vẫn trả 200 trong các trường hợp này.
