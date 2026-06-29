/**
 * app.js
 *
 * Use `app.js` to run your app without `sails lift`.
 * To start the server, run: `node app.js`.
 */

// Đảm bảo đường dẫn thực thi luôn trỏ về thư mục gốc của dự án
process.chdir(__dirname);

// Đảm bảo module `sails` được tìm thấy
(function () {
  var sails;
  try {
    sails = require('sails');
  } catch (e) {
    console.error('Lỗi: Không tìm thấy module `sails`.');
    console.error('Hãy chạy lệnh `npm install sails@0.12.14` ở thư mục hiện tại.');
    return;
  }

  // Khởi tạo biến rc để đọc cấu hình từ file .sailsrc
  var rc;
  try {
    rc = require('rc');
  } catch (e0) {
    try {
      rc = require('sails/node_modules/rc');
    } catch (e1) {
      console.error('Cảnh báo: Không tìm thấy module `rc`. Các file `.sailsrc` sẽ bị bỏ qua.');
      rc = function () { return {}; };
    }
  }

  // Khởi động server với các cấu hình đã được nạp
  sails.lift(rc('sails'));
})();