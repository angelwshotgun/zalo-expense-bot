import fs from 'fs';
import path from 'path';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  HeadingLevel,
  WidthType,
  BorderStyle,
  convertInchesToTwip,
  ShadingType,
} from 'docx';

async function generateDocx() {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.8),
              right: convertInchesToTwip(0.8),
              bottom: convertInchesToTwip(0.8),
              left: convertInchesToTwip(0.8),
            },
          },
        },
        children: [
          // Tiêu đề chính
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: 'HƯỚNG DẪN SỬ DỤNG BOT QUẢN LÝ THU & CHI TIÊU TRÊN ZALO',
                bold: true,
                size: 32, // 16pt
                color: '1E3A8A',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: 'Hệ thống Quản Trị Thu Chi Tự Động & Độc Lập Theo Nhóm Chat',
                italics: true,
                size: 24, // 12pt
                color: '4B5563',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: '🌐 Website Quản Trị: https://zalo-expense-bot.onrender.com/admin (PIN: 123456)',
                bold: true,
                size: 22,
                color: '2563EB',
              }),
            ],
          }),

          // PHẦN I
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 },
            children: [
              new TextRun({
                text: 'I. BẢNG DANH MỤC CHUẨN CỦA SHOP',
                bold: true,
                size: 26,
                color: '1E40AF',
              }),
            ],
          }),

          // Tiểu mục Thu
          new Paragraph({
            spacing: { before: 100, after: 80 },
            children: [
              new TextRun({
                text: '1. Danh Mục Thu (Bán hàng):',
                bold: true,
                size: 22,
                color: '059669',
              }),
            ],
          }),

          // Bảng Thu
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'STT', bold: true })] })],
                    shading: { fill: 'E0F2FE', type: ShadingType.CLEAR },
                    width: { size: 10, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Mặt Hàng', bold: true })] })],
                    shading: { fill: 'E0F2FE', type: ShadingType.CLEAR },
                    width: { size: 30, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Biểu Tượng', bold: true })] })],
                    shading: { fill: 'E0F2FE', type: ShadingType.CLEAR },
                    width: { size: 20, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Ví Dụ Ghi Nhận', bold: true })] })],
                    shading: { fill: 'E0F2FE', type: ShadingType.CLEAR },
                    width: { size: 40, type: WidthType.PERCENTAGE },
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('1')] }),
                  new TableCell({ children: [new Paragraph('Thư hoa')] }),
                  new TableCell({ children: [new Paragraph('🌸 Thư hoa')] }),
                  new TableCell({ children: [new Paragraph('+ Thư hoa 115k khách hàng Abc')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('2')] }),
                  new TableCell({ children: [new Paragraph('Tủ hoa')] }),
                  new TableCell({ children: [new Paragraph('🪞 Tủ hoa')] }),
                  new TableCell({ children: [new Paragraph('+ Tủ hoa 299k cọc trước 100k')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('3')] }),
                  new TableCell({ children: [new Paragraph('Huy chương')] }),
                  new TableCell({ children: [new Paragraph('🏅 Huy chương')] }),
                  new TableCell({ children: [new Paragraph('+ Huy chương 85k')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('4')] }),
                  new TableCell({ children: [new Paragraph('Khung ảnh')] }),
                  new TableCell({ children: [new Paragraph('🖼️ Khung ảnh')] }),
                  new TableCell({ children: [new Paragraph('+ Khung ảnh 180k')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('5')] }),
                  new TableCell({ children: [new Paragraph('Móc khóa')] }),
                  new TableCell({ children: [new Paragraph('🔑 Móc khóa')] }),
                  new TableCell({ children: [new Paragraph('+ Móc khóa 50k')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('6')] }),
                  new TableCell({ children: [new Paragraph('Cúp hoa')] }),
                  new TableCell({ children: [new Paragraph('🏆 Cúp hoa')] }),
                  new TableCell({ children: [new Paragraph('+ Cúp hoa 450k')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('7')] }),
                  new TableCell({ children: [new Paragraph('Thiệp lẻ')] }),
                  new TableCell({ children: [new Paragraph('💌 Thiệp lẻ')] }),
                  new TableCell({ children: [new Paragraph('+ Thiệp lẻ 25k')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('8')] }),
                  new TableCell({ children: [new Paragraph('Khác')] }),
                  new TableCell({ children: [new Paragraph('📦 Khác')] }),
                  new TableCell({ children: [new Paragraph('Bán sản phẩm ngoài danh mục')] }),
                ],
              }),
            ],
          }),

          // Tiểu mục Chi
          new Paragraph({
            spacing: { before: 160, after: 80 },
            children: [
              new TextRun({
                text: '2. Danh Mục Chi (Chi phí hoạt động):',
                bold: true,
                size: 22,
                color: 'DC2626',
              }),
            ],
          }),

          // Bảng Chi
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'STT', bold: true })] })],
                    shading: { fill: 'FEE2E2', type: ShadingType.CLEAR },
                    width: { size: 10, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Khoản Chi', bold: true })] })],
                    shading: { fill: 'FEE2E2', type: ShadingType.CLEAR },
                    width: { size: 30, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Mục Đích', bold: true })] })],
                    shading: { fill: 'FEE2E2', type: ShadingType.CLEAR },
                    width: { size: 30, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Ví Dụ Ghi Nhận', bold: true })] })],
                    shading: { fill: 'FEE2E2', type: ShadingType.CLEAR },
                    width: { size: 30, type: WidthType.PERCENTAGE },
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('1')] }),
                  new TableCell({ children: [new Paragraph('Nguyên vật liệu')] }),
                  new TableCell({ children: [new Paragraph('Hoa sáp, ruy băng, xốp cắm')] }),
                  new TableCell({ children: [new Paragraph('- Nguyên vật liệu 500k, mua hoa sáp 200k')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('2')] }),
                  new TableCell({ children: [new Paragraph('Ship bưu cục')] }),
                  new TableCell({ children: [new Paragraph('Gửi bưu điện, VNPost, GHTK')] }),
                  new TableCell({ children: [new Paragraph('- Ship bưu cục 30k')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('3')] }),
                  new TableCell({ children: [new Paragraph('Ship hoả tốc')] }),
                  new TableCell({ children: [new Paragraph('Grab, Be, Ahamove giao nhanh')] }),
                  new TableCell({ children: [new Paragraph('- Ship hoả tốc 45k')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('4')] }),
                  new TableCell({ children: [new Paragraph('Khác')] }),
                  new TableCell({ children: [new Paragraph('Tiền điện, nước, mặt bằng, ăn uống')] }),
                  new TableCell({ children: [new Paragraph('- Tiền điện 500k shop hoa tháng 9')] }),
                ],
              }),
            ],
          }),

          // PHẦN II
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 },
            children: [
              new TextRun({
                text: 'II. HƯỚNG DẪN GHI CHÉP THEO QUY TẮC LINH HOẠT (+ / -)',
                bold: true,
                size: 26,
                color: '1E40AF',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: '1. Ghi nhận Thu (Bán hàng): ', bold: true }),
              new TextRun({ text: 'Dùng cú pháp ' }),
              new TextRun({ text: '+ [Mặt hàng] [Số tiền] [Lý do / Tên khách]', bold: true, color: '059669' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: '   • Ví dụ: ' }),
              new TextRun({ text: '+ thư hoa 115k khách hàng Abc', bold: true }),
              new TextRun({ text: ' -> Lưu 115.000đ, Mục Thư hoa, Ghi chú "khách hàng Abc".' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: '   • Ví dụ: ' }),
              new TextRun({ text: '+ tủ hoa 299k cọc trước 100k', bold: true }),
              new TextRun({ text: ' -> Lưu 299.000đ, Mục Tủ hoa, Ghi chú "cọc trước 100k".' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({ text: '   • Hỗ trợ đảo vị trí tự nhiên: ' }),
              new TextRun({ text: '+ 115k thư hoa', bold: true }),
              new TextRun({ text: ', hoặc ' }),
              new TextRun({ text: 'bán 2 khung ảnh 360k', bold: true }),
              new TextRun({ text: '.' }),
            ],
          }),

          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: '2. Ghi nhận Chi (Chi phí): ', bold: true }),
              new TextRun({ text: 'Dùng cú pháp ' }),
              new TextRun({ text: '- [Khoản chi] [Số tiền] [Lý do / Ghi chú]', bold: true, color: 'DC2626' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: '   • Ví dụ: ' }),
              new TextRun({ text: '- tiền điện 500k shop hoa tháng 9', bold: true }),
              new TextRun({ text: ' -> Lưu chi 500.000đ, Ghi chú "shop hoa tháng 9".' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: '   • Ví dụ: ' }),
              new TextRun({ text: '- 35k ruy băng gửi bạn An', bold: true }),
              new TextRun({ text: ' -> Lưu chi 35.000đ, Mục Nguyên vật liệu, Ghi chú "gửi bạn An".' }),
            ],
          }),

          new Paragraph({
            spacing: { before: 100, after: 80 },
            children: [
              new TextRun({ text: '3. Cơ chế Bóc tách Lý do sau số tiền: ', bold: true }),
              new TextRun({ text: 'Mọi thông tin người dùng gõ sau số tiền đều được hệ thống tự động bóc tách sạch sẽ và lưu vào mục Ghi chú để đối soát sau này.' }),
            ],
          }),

          new Paragraph({
            spacing: { before: 100, after: 80 },
            children: [
              new TextRun({ text: '4. Phát hiện Typo & Hỏi lại thông minh (Multi-turn Context): ', bold: true }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: '   • ' }),
              new TextRun({ text: 'Chống lỗi gõ nhầm tiền: ', bold: true }),
              new TextRun({ text: 'Gõ thừa chữ như "115kk", "200kkk", "115oo" sẽ được Bot phát hiện và nhắc người dùng nhắn lại số tiền.' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({ text: '   • ' }),
              new TextRun({ text: 'Hội thoại nhiều lượt (Multi-turn): ', bold: true }),
              new TextRun({ text: 'Nếu lỡ gửi "+ thư hoa khách hàng Abc" mà quên gõ tiền, Bot sẽ tạo bản nháp chờ và hỏi: "Bot chưa thấy số tiền cho đơn này...". Bạn chỉ cần gõ tiếp "115k", Bot tự động gộp và hoàn tất lưu.' }),
            ],
          }),

          // PHẦN III
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 },
            children: [
              new TextRun({
                text: 'III. TÍNH NĂNG THÔNG MINH BỔ TRỢ',
                bold: true,
                size: 26,
                color: '1E40AF',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: '1. Gửi ảnh biên lai / chuyển khoản ngân hàng: ', bold: true }),
              new TextRun({ text: 'Chụp ảnh màn hình gửi vào Zalo, AI tự động nhận diện số tiền. Bạn có thể chat ngay tên sản phẩm bên dưới để gộp đơn tức thì.' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: '2. Xóa thông minh (Smart Delete): ', bold: true }),
              new TextRun({ text: 'Nhắn ' }),
              new TextRun({ text: '"xóa", "hủy đơn", "nhầm rồi xóa"', bold: true }),
              new TextRun({ text: ' để gỡ đơn vừa lưu gần nhất ra khỏi sổ và trừ khỏi báo cáo.' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: '3. Sửa giao dịch: ', bold: true }),
              new TextRun({ text: 'Nhắn ' }),
              new TextRun({ text: '"sửa thành 350k", "đổi sang Thư hoa"', bold: true }),
              new TextRun({ text: ' để cập nhật thông tin nhanh chóng.' }),
            ],
          }),

          // PHẦN IV
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 },
            children: [
              new TextRun({
                text: 'IV. TRA CỨU & XEM BÁO CÁO THỐNG KÊ',
                bold: true,
                size: 26,
                color: '1E40AF',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: '• ' }),
              new TextRun({ text: '#baocao', bold: true }),
              new TextRun({ text: ' : Xem tổng hợp Thu, Chi & Lợi nhuận hôm nay.' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: '• ' }),
              new TextRun({ text: '#baocaothu / #baocaochi', bold: true }),
              new TextRun({ text: ' : Xem riêng doanh thu hoặc chi phí hôm nay.' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: '• ' }),
              new TextRun({ text: '#baocao thangnay', bold: true }),
              new TextRun({ text: ' : Xem tổng hợp thu chi cả tháng này.' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({ text: '• ' }),
              new TextRun({ text: 'Hỏi đáp AI tự nhiên (NL2Query): ', bold: true }),
              new TextRun({ text: 'Gõ "báo cáo thu chi tháng 8/2026", "tháng này bán bao nhiêu tủ hoa?", "tổng tiền ship hoả tốc tuần này"...' }),
            ],
          }),

          // PHẦN V
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 },
            children: [
              new TextRun({
                text: 'V. TRANG QUẢN TRỊ WEB ADMIN & PHÂN BIỆT SỔ GIỮA CÁC NHÓM CHAT',
                bold: true,
                size: 26,
                color: '1E40AF',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: '🌐 Địa chỉ: ' }),
              new TextRun({ text: 'https://zalo-expense-bot.onrender.com/admin', bold: true, color: '2563EB' }),
              new TextRun({ text: '  |  Mã PIN: ' }),
              new TextRun({ text: '123456', bold: true, color: 'DC2626' }),
            ],
          }),

          new Paragraph({
            spacing: { before: 80, after: 60 },
            children: [
              new TextRun({ text: '1. Phân biệt Sổ theo từng Nhóm Chat / Cá nhân: ', bold: true }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: '   • Mỗi nhóm chat Zalo của shop có một Sổ thu chi hoàn toàn độc lập, không bị lẫn số liệu sang nhóm khác.' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: '   • ' }),
              new TextRun({ text: 'Bộ lọc Dropdown "👥 Tất cả Sổ / Nhóm": ', bold: true }),
              new TextRun({ text: 'Cho phép chủ shop chọn riêng từng nhóm chat để xem danh sách đơn hàng và xem 4 thẻ KPI (Tổng Thu, Tổng Chi, Lợi Nhuận, Số Giao Dịch) tính riêng biệt cho nhóm đó.' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({ text: '   • ' }),
              new TextRun({ text: 'Cột "Tài Khoản / Sổ" trên bảng dữ liệu: ', bold: true }),
              new TextRun({ text: 'Hiển thị huy hiệu màu sắc rõ ràng (👥 Nhóm Chat, 👑 Chủ Shop, 👤 Cá nhân).' }),
            ],
          }),

          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({ text: '2. Quản lý Giao Dịch Thu & Chi Thủ Công: ', bold: true }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: '   • ' }),
              new TextRun({ text: '➕ Thêm Giao Dịch: ', bold: true }),
              new TextRun({ text: 'Chủ shop có thể nhập đơn thủ công và chọn đích danh Sổ của nhóm chat cần ghi nhận.' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: '   • ' }),
              new TextRun({ text: '✏️ Chỉnh Sửa Giao Dịch: ', bold: true }),
              new TextRun({ text: 'Sửa lại số tiền, danh mục, nội dung, thời gian khi cần.' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({ text: '   • ' }),
              new TextRun({ text: '🗑️ Xóa Giao Dịch: ', bold: true }),
              new TextRun({ text: 'Gỡ giao dịch và tự động cập nhật lại tổng doanh thu trên toàn hệ thống.' }),
            ],
          }),

          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({ text: '3. Quản Trị Danh Mục An Toàn: ', bold: true }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: '   • Thêm mặt hàng bán hoặc khoản chi mới kèm Icon / Emoji tùy ý.' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 140 },
            children: [
              new TextRun({ text: '   • Xóa danh mục được bảo vệ an toàn: Các đơn hàng cũ thuộc danh mục bị xóa sẽ tự động chuyển về mục "Khác" để không bao giờ bị lệch tổng doanh thu của shop.' }),
            ],
          }),

          // Lời kết
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200 },
            children: [
              new TextRun({
                text: '🌸 Chúc Quý Shop Buôn May Bán Đắt & Quản Lý Tài Chính Hiệu Quả! 🌸',
                bold: true,
                size: 24,
                color: 'DB2777',
              }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = path.resolve('HUONG_DAN_SU_DUNG_BOT_ZALO.docx');
  fs.writeFileSync(outPath, buffer);
  console.log(`✅ Đã xuất file Word thành công tại: ${outPath} (${buffer.length} bytes)`);
}

generateDocx().catch((err) => {
  console.error('❌ Lỗi tạo file docx:', err);
  process.exit(1);
});
