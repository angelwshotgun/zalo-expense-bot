# 📖 HƯỚNG DẪN SỬ DỤNG BOT QUẢN LÝ THU & CHI TIÊU TRÊN ZALO
> **Dành cho Chủ shop & Nhân viên bán hàng shop hoa sáp**  
> *Hệ thống quản lý tự động, hỗ trợ ghi chép siêu tốc, đọc bill chuyển khoản bằng AI và tra cứu báo cáo bằng tiếng Việt tự nhiên.*

---

## 📌 MỤC LỤC
1. [Giới thiệu chung](#1-giới-thiệu-chung)
2. [Bảng danh mục chuẩn của Shop](#2-bảng-danh-mục-chuẩn-của-shop)
3. [Ghi chép Bán hàng (Thu nhập)](#3-ghi-chép-bán-hàng-thu-nhập)
4. [Ghi chép Chi phí hoạt động](#4-ghi-chép-chi-phí-hoạt-động)
5. [Gửi ảnh chụp màn hình ngân hàng / Hóa đơn](#5-gửi-ảnh-chụp-màn-hình-ngân-hàng--hóa-đơn)
6. [Sửa và Xóa khi ghi nhầm](#6-sửa-và-xóa-khi-ghi-nhầm)
7. [Tra cứu & Xem báo cáo thống kê](#7-tra-cứu--xem-báo-cáo-thống-kê)
8. [Bảng tóm tắt cú pháp nhanh (Cheat Sheet)](#8-bảng-tóm-tắt-cú-pháp-nhanh-cheat-sheet)

---

## 1. Giới thiệu chung

Bot hoạt động trực tiếp trong khung chat Zalo của bạn (hoặc trong nhóm chat Zalo của Shop).  
- ⚡ **Ghi chép tức thì**: Phản hồi dưới 0.1 giây đối với các tin nhắn văn bản.
- 📸 **Đọc ảnh chuyển khoản**: Tự động nhận diện số tiền từ ảnh chụp màn hình app ngân hàng (Vietcombank, MB, Techcombank, MoMo, BIDV, v.v.).
- 🤖 **Trí tuệ nhân tạo (AI)**: Bạn có thể hỏi báo cáo bằng ngôn ngữ nói tự nhiên, không cần nhớ đúng từng cú pháp máy móc.
- ☁️ **Lưu trữ đám mây 24/7**: Toàn bộ dữ liệu được lưu an toàn trên cơ sở dữ liệu Supabase, không bị mất khi tắt máy tính hay điện thoại.

---

## 2. Bảng danh mục chuẩn của Shop

Để dữ liệu báo cáo luôn chuẩn xác và không bị phân mảnh, hệ thống đã được cấu hình với các danh mục chuẩn:

### 🌸 Danh mục THU (Bán hàng):
| Mặt hàng | Icon | Ví dụ ghi chép |
| :--- | :---: | :--- |
| **Thư hoa** | ✉️ | `Thư hoa 115k`, `+115k thư hoa` |
| **Huy chương** | 🏅 | `Huy chương 85k`, `+85k huy chuong` |
| **Tủ hoa** | 🪞 | `Tủ hoa 299k`, `tu hoa 350k` |
| **Thiệp lẻ** | 💌 | `Thiệp lẻ 25k`, `thiep le 30k` |
| **Khung ảnh** | 🖼️ | `Khung ảnh 180k`, `khung anh 220k` |
| **Cúp hoa** | 🏆 | `Cúp hoa 450k`, `cup hoa 500k` |
| **Móc khóa** | 🔑 | `Móc khóa 50k`, `moc khoa 45k` |
| **Khác** | 📦 | Bán các sản phẩm hoa sáp hoặc phụ kiện khác ngoài danh mục trên |

### 💸 Danh mục CHI (Chi phí hoạt động):
| Khoản chi | Icon | Mục đích sử dụng | Ví dụ ghi chép |
| :--- | :---: | :--- | :--- |
| **Nguyên vật liệu** | 🧱 | Mua hoa sáp, ruy băng, xốp cắm, hộp mica, giấy gói, keo nến, túi bóng | `Nguyên vật liệu 500k`, `mua hoa sáp 1tr2` |
| **Ship bưu cục** | 📮 | Tiền gửi bưu điện, VNPost, Viettel Post, GHTK, ship chậm thông thường | `Ship bưu cục 30k`, `gửi bưu điện 45k` |
| **Ship hoả tốc** | ⚡ | Tiền thuê Grab, Ahamove, Be, Lalamove giao hỏa tốc trong ngày | `Ship hoả tốc 45k`, `grab giao hoa 60k` |
| **Khác** | 💸 | Tiền ăn uống nhân viên, tiền điện, mặt bằng, sửa sang, chi phí sinh hoạt | `-200k tiền điện`, `ăn trưa 45k` |

---

## 3. Ghi chép Bán hàng (Thu nhập)

Mỗi khi bán được đơn hàng, bạn chỉ cần gửi tin nhắn tên mặt hàng kèm số tiền:

```
Tủ hoa 299k
Thư hoa 115k
Móc khóa 50k
+115k thư hoa
Bán 2 khung ảnh 360k
```

> 💡 **Quy tắc đọc số tiền thông minh:**
> - Viết tắt: `50k` $\rightarrow$ 50.000 đ | `115k` $\rightarrow$ 115.000 đ
> - Viết chữ: `150 nghìn` $\rightarrow$ 150.000 đ | `1tr2` hoặc `1.2 triệu` $\rightarrow$ 1.200.000 đ
> - Viết số đầy đủ: `299000` $\rightarrow$ 299.000 đ

Sau khi gửi, Bot sẽ lập tức phản hồi thẻ xác nhận:
```
✅ ĐÃ GHI NHẬN BÁN HÀNG!
• Loại: Thu nhập / Bán hàng
• Mặt hàng: 🪞 Tủ hoa
• Số tiền: +299.000 ₫
• Ghi chú: Tủ hoa 299k
```

---

## 4. Ghi chép Chi phí hoạt động

Mỗi khi mua đồ làm hàng, thanh toán tiền ship hoặc chi tiêu sinh hoạt, bạn nhắn tin theo các cách sau:

```
Nguyên vật liệu 500k
Ship bưu cục 30k
Ship hoả tốc 45k
-200k tiền điện
Ăn trưa nhân viên 45k
```

Bot sẽ tự động phân loại đúng khoản chi và phản hồi:
```
✅ ĐÃ GHI NHẬN KHOẢN CHI!
• Loại: Khoản chi
• Khoản chi: 🧱 Nguyên vật liệu
• Số tiền: -500.000 ₫
• Ghi chú: Nguyên vật liệu 500k
```

---

## 5. Gửi ảnh chụp màn hình ngân hàng / Hóa đơn

Bot có khả năng đọc ảnh thông minh bằng AI Gemini:

1. **Khi khách chuyển khoản thành công**: Bạn chỉ cần chụp ảnh màn hình chuyển khoản và gửi vào Zalo.
2. **Chat bổ sung liền mạch (Không bị ngắt quãng)**:
   - Khi gửi ảnh, nếu trên bill chưa có tên sản phẩm (ví dụ khách chỉ chuyển tiền và ghi chú "CK"), bạn chỉ cần **chat ngay tên mặt hàng** (ví dụ: `Tủ hoa` hoặc `Thư hoa`).
   - Bot sẽ tự động gộp ảnh và tên bạn vừa nhắn lại thành **1 đơn hàng duy nhất** mà không bắt bạn phải chọn lại danh mục!
3. Nếu bạn quên chưa chat bổ sung, bot sẽ hiển thị danh sách các nút bấm danh mục để bạn ấn chọn 1 chạm.

---

## 6. Sửa và Xóa khi ghi nhầm

Trong lúc bán hàng vội, nếu bạn nhắn nhầm số tiền hoặc nhầm mặt hàng, **không cần lo lắng**, bạn có thể sửa hoặc xóa cực kỳ dễ dàng:

### 🗑️ Xóa giao dịch vừa ghi:
Chỉ cần nhắn bất kỳ câu nào sau đây:
```
xóa
xoá đơn
xóa vừa rồi
nhầm rồi xóa
hủy đơn
```
Bot sẽ lập tức xóa giao dịch gần nhất khỏi hệ thống và thông báo chi tiết giao dịch đã bị xóa.

### ✏️ Chỉnh sửa giao dịch vừa ghi:
Chỉ cần nhắn yêu cầu sửa theo ngôn ngữ tự nhiên:
- **Sửa lại số tiền**:  
  `sửa thành 350k` hoặc `350k mới đúng`
- **Sửa lại mặt hàng**:  
  `đổi sang Thư hoa` hoặc `đổi thành Huy chương`
- **Sửa cả tiền và loại giao dịch**:  
  `đổi thành ship bưu cục 30k` hoặc `sửa thành chi nguyên vật liệu 400k`

Bot sẽ cập nhật trực tiếp vào cơ sở dữ liệu và gửi lại xác nhận đã sửa xong.

---

## 7. Tra cứu & Xem báo cáo thống kê

Hệ thống cung cấp cả 2 cách xem báo cáo: **Phím tắt nhanh** và **Hỏi đáp tự nhiên bằng AI**.

### Cách 1: Phím tắt nhanh (Tức thì < 0.1s)
| Phím tắt | Ý nghĩa |
| :--- | :--- |
| `#baocao` hoặc `báo cáo` | Xem tổng hợp Thu & Chi trong ngày hôm nay |
| `#baocaothu` | Xem riêng doanh thu bán hàng hôm nay (chi tiết theo từng mặt hàng) |
| `#baocaochi` | Xem riêng các khoản chi phí hoạt động hôm nay |
| `#baocao thangnay` | Xem tổng hợp Thu, Chi và Lợi nhuận ròng của cả tháng này |
| `#baocaothu thangnay` | Xem riêng doanh thu bán hàng của cả tháng này |
| `#baocaochi thangnay` | Xem riêng chi phí của cả tháng này |

### Cách 2: Hỏi đáp tự nhiên bằng AI (NL2Query Engine)
Bạn có thể hỏi bot bất cứ câu hỏi nào như đang chat với kế toán riêng của shop:

* **Xem báo cáo theo tháng bất kỳ:**
  - `"hãy cho tôi báo cáo thu chi của tháng 8/2026"`
  - `"báo cáo doanh thu tháng 7/2026"`
  - `"tháng trước chi hết bao nhiêu tiền?"`
* **Hỏi riêng từng mặt hàng:**
  - `"tháng này bán được bao nhiêu tiền tủ hoa rồi?"`
  - `"hôm nay bán được mấy cái thư hoa?"`
  - `"móc khóa từ đầu tháng đến giờ bán được bao nhiêu cái?"`
* **Hỏi chi phí cụ thể:**
  - `"từ đầu tuần đến giờ chi hết bao nhiêu tiền ship hoả tốc?"`
  - `"tháng này tiền nguyên vật liệu hết bao nhiêu?"`
* **Xem lịch sử gần đây:**
  - `"hôm qua có những đơn nào?"`

---

## 8. Bảng tóm tắt cú pháp nhanh (Cheat Sheet)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌸 GHI ĐƠN BÁN HÀNG:
   • Tủ hoa 299k
   • Thư hoa 115k
   • Huy chương 85k
   • Móc khóa 50k
   • Khung ảnh 180k
   • Cúp hoa 450k
   • Thiệp lẻ 25k

💸 GHI KHOẢN CHI:
   • Nguyên vật liệu 500k
   • Ship bưu cục 30k
   • Ship hoả tốc 45k
   • -200k tiền điện

📊 XEM BÁO CÁO NHANH:
   • #baocao          (Tổng hợp hôm nay)
   • #baocaothu       (Doanh thu hôm nay)
   • #baocaochi       (Chi phí hôm nay)
   • #baocao thangnay (Cả tháng này)

🤖 HỎI AI TỰ NHIÊN:
   • "hãy cho tôi báo cáo thu chi tháng 8/2026"
   • "tháng này bán được bao nhiêu tiền tủ hoa rồi?"
   • "tuần này chi bao nhiêu tiền ship?"

🛠️ SỬA & XÓA KHI NHẦM:
   • xóa               (Xóa đơn gần nhất)
   • sửa thành 350k    (Sửa lại số tiền)
   • đổi sang Thư hoa  (Sửa lại mặt hàng)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
