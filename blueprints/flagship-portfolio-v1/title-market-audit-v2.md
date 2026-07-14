# Audit tên truyện nam flagship — V2

## Kết luận

Tên cũ sai định vị thị trường. Cả 30 tên đều dưới 8 từ, trung bình 5,5 từ và 31,2 ký tự. Phần lớn chỉ tạo không khí (`Vòng Đời Của Đá`, `Kết Tinh Của Lửa`, `Sổ Nợ Phố Cũ`) nhưng giấu tình huống vào truyện, lợi thế của main và payoff. Đây là kiểu tên có thể dùng làm tên tập hoặc nhãn nội bộ, không nên tự động trở thành tên xuất bản.

Tên V2 trung bình 14,1 từ và 61,4 ký tự. Mỗi tên có hai vế dễ quét trên bảng truyện và nói thẳng ít nhất hai trong ba thành phần:

1. Main vào truyện bằng thân phận hoặc tình huống nào.
2. Main có cơ chế/lợi thế gì khác người.
3. Độc giả sẽ nhận payoff cụ thể nào.

Không đồng nhất tất cả thành một câu mẫu. Portfolio trộn năm cấu trúc: `tình huống → hành động`, `mệnh lệnh → phản chuyển`, `thân phận → năng lực`, `giới hạn → cách phá`, và `mục tiêu đời sống → phương thức đạt được`.

## Bằng chứng thị trường Trung Quốc

- Fanqie đang có hẳn chức năng `多书名实验` (thí nghiệm nhiều tên), cho thấy tên là biến số acquisition cần thử nghiệm chứ không phải phần văn chương bất biến: [Fanqie Writer Zone](https://fanqienovel.com/writer/zone/?enter_from=menu).
- Tên nam tần mới công bố trực tiếp setup và payoff, ví dụ `开局上交黑暗动乱，家族助我成仙`: [Fanqie](https://fanqienovel.com/page/7579918004901645374).
- Dòng niên đại dùng cấu trúc thời điểm + hoàn cảnh + kết quả: `60年代：开局荒年，我带着全村吃肉`: [Fanqie](https://fanqienovel.com/keyword/7396062335057840128).
- Dòng xuyên việt/đời sống nói thẳng hành động dài kỳ: `穿越90年代，带全村发家致富`: [Fanqie](https://fanqienovel.com/page/7509705154900282430).
- Cấu trúc phản chuyển đối thoại `让你……你却……` xuất hiện vì tạo ngay một câu hỏi nhân quả, ví dụ `让你冒充男朋友，你竟然来真的？`: [Fanqie](https://fanqienovel.com/keyword/7463955287221848074).
- Tên dài không cứu được concept mơ hồ. Các title vẫn phải đúng cơ chế và không hứa `vô địch`, `giàu nhất`, `cứu cả thế giới` nếu opening/runway không chứng minh được.

## Thay đổi hệ thống

- `workingTitle` của Concept Lab chỉ còn là nhãn thử nghiệm, không được tự động chảy vào StorySpec.
- Human selection bắt buộc có `approvedTitle` dài 10–18 từ, 40–80 ký tự và gồm hai vế đọc được.
- Launch Architect phải sao chép đúng `approvedTitle`; nếu tự dùng lại tên ngắn từ Concept Lab, setup bị chặn.
- Prompt Concept Lab yêu cầu tên trực diện nhưng final gate vẫn do người duyệt vì schema không thể đánh giá tên có thật sự hấp dẫn hay không.
- Cover renderer co chữ theo số dòng để tên dài vẫn nằm trong vùng typography, không đè nhân vật hoặc watermark.

Danh sách 30 tên mới và cover tương ứng nằm tại [catalogue-v1.md](./catalogue-v1.md).
