const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./hethong_v11.db'); // Đổi tên file DB thành V11 cho đồng bộ

db.serialize(() => {
    console.log("--- KHOI TAO DATABASE V11.0 (FINAL) ---");

    const tables = ['THONG_BAO', 'CHI_TIET_KET_QUA', 'PHIEU_KET_QUA', 'THEO_DOI_TIEN_DO', 
                    'TIEU_CHI', 'BO_TIEU_CHI', 'DOT_DANH_GIA', 
                    'DANH_SACH_LOP', 'LOP_HOC_PHAN', 'GIANG_VIEN', 'SINH_VIEN', 'ADMIN'];
    tables.forEach(t => db.run(`DROP TABLE IF EXISTS ${t}`));

    // --- TẠO BẢNG ---
    db.run(`CREATE TABLE ADMIN (UserID TEXT PRIMARY KEY, HoTen TEXT, MatKhau TEXT)`);
    
    // SINH VIÊN (Có cột Email)
    db.run(`CREATE TABLE SINH_VIEN (
        MaSV TEXT PRIMARY KEY, HoTen TEXT, MatKhau TEXT, Email TEXT,
        LopSH TEXT, Khoa TEXT, NienKhoa TEXT, 
        TrangThai TEXT DEFAULT 'ACTIVE', LyDoKhoa TEXT
    )`);

    // GIẢNG VIÊN (Có cột Email)
    db.run(`CREATE TABLE GIANG_VIEN (
        MaGV TEXT PRIMARY KEY, HoTen TEXT, MatKhau TEXT, Email TEXT,
        HocVi TEXT, DonViCongTac TEXT, 
        TrangThai TEXT DEFAULT 'ACTIVE', LyDoKhoa TEXT
    )`);

    // BẢNG THÔNG BÁO
    db.run(`CREATE TABLE THONG_BAO (
        ID INTEGER PRIMARY KEY AUTOINCREMENT,
        TieuDe TEXT,
        NoiDung TEXT,
        NgayGui DATETIME DEFAULT CURRENT_TIMESTAMP,
        HienThi INTEGER DEFAULT 1
    )`);

    db.run(`CREATE TABLE LOP_HOC_PHAN (MaLop TEXT PRIMARY KEY, TenMonHoc TEXT, HocKy TEXT, MaGV TEXT, Khoa TEXT)`);
    db.run(`CREATE TABLE DANH_SACH_LOP (MaSV TEXT, MaLop TEXT, PRIMARY KEY (MaSV, MaLop))`);
    db.run(`CREATE TABLE DOT_DANH_GIA (MaDot TEXT PRIMARY KEY, TenDot TEXT, TuNgay DATE, DenNgay DATE, TrangThai TEXT)`);
    db.run(`CREATE TABLE BO_TIEU_CHI (MaBo TEXT PRIMARY KEY, TenBoTieuChi TEXT)`);
    db.run(`CREATE TABLE TIEU_CHI (MaTieuChi INTEGER PRIMARY KEY AUTOINCREMENT, MaBo TEXT, NoiDungCauHoi TEXT, DiemToiDa INTEGER)`);
    db.run(`CREATE TABLE THEO_DOI_TIEN_DO (MaSV TEXT, MaLop TEXT, MaDot TEXT, ThoiGianHoanThanh DATETIME, TrangThai TEXT DEFAULT 'ChuaLam', PRIMARY KEY (MaSV, MaLop, MaDot))`);
    db.run(`CREATE TABLE PHIEU_KET_QUA (MaPhieu INTEGER PRIMARY KEY AUTOINCREMENT, MaLop TEXT, MaDot TEXT, ThoiGianGui DATETIME DEFAULT CURRENT_TIMESTAMP, YKienKhac TEXT)`);
    db.run(`CREATE TABLE CHI_TIET_KET_QUA (MaChiTiet INTEGER PRIMARY KEY AUTOINCREMENT, MaPhieu INTEGER, MaTieuChi TEXT, DiemSo INTEGER)`);

    // --- DATA SEEDING ---
    console.log("--- NẠP DỮ LIỆU MẪU (KÈM EMAIL) ---");
    db.run(`INSERT INTO DOT_DANH_GIA VALUES ('DOT1', 'Học kỳ 1 - 2026', '2026-01-01', '2026-12-31', 'OPEN')`);
    db.run(`INSERT INTO BO_TIEU_CHI VALUES ('BO01', 'Đánh giá Lý thuyết')`);
    
    // Câu hỏi
    const qs = [
        "Giảng viên lên lớp đúng giờ và đảm bảo thời lượng",
        "Nội dung bài giảng rõ ràng, dễ hiểu",
        "Giảng viên giải đáp thắc mắc nhiệt tình",
        "Phương pháp giảng dạy lôi cuốn, sinh động",
        "Tài liệu học tập được cung cấp đầy đủ",
        "Thời gian biểu hợp lý"
    ];
    qs.forEach(q => db.run(`INSERT INTO TIEU_CHI (MaBo, NoiDungCauHoi, DiemToiDa) VALUES ('BO01', ?, 5)`, [q]));

    db.run(`INSERT INTO ADMIN VALUES ('admin', 'Phòng khảo thí', 'admin123')`);
    
    // GIẢNG VIÊN (Thêm Email)
    db.run(`INSERT INTO GIANG_VIEN VALUES ('GV01', 'Thầy Ngô Hữu Huy', '123', 'huy.nh@ictu.edu.vn', 'Tiến sĩ', 'Khoa CNTT', 'ACTIVE', NULL)`);
    db.run(`INSERT INTO GIANG_VIEN VALUES ('GV02', 'Thầy Lại Văn Trung', '123', 'trung.lv@ictu.edu.vn', 'Thạc sĩ', 'Khoa CNTT', 'ACTIVE', NULL)`);
    db.run(`INSERT INTO GIANG_VIEN VALUES ('GV03', 'Cô Lê Thu Trang', '123', 'trang.lt@ictu.edu.vn', 'Thạc sĩ', 'Khoa CNTT', 'ACTIVE', NULL)`);
    db.run(`INSERT INTO GIANG_VIEN VALUES ('GV04', 'Thầy Trần Văn Mới', '123', 'moi.tv@ictu.edu.vn', 'Tiến sĩ', 'Khoa LLCT', 'ACTIVE', NULL)`);
    db.run(`INSERT INTO GIANG_VIEN VALUES ('GV05', 'Thầy Nguyễn Văn Giang', '123', 'giang.nv@ictu.edu.vn', 'Thạc sĩ', 'Khoa Kế toán', 'ACTIVE', NULL)`);
    db.run(`INSERT INTO GIANG_VIEN VALUES ('GV06', 'Thầy Trần Văn Nam', '123', 'nam.tv@ictu.edu.vn', 'Tiến sĩ', 'Khoa Kế toán', 'ACTIVE', NULL)`);

    // SINH VIÊN CNTT (Thêm Email - Để test quên MK)
    // Mật khẩu SV01 là '123'. Email: sv01@ictu.edu.vn
    db.run(`INSERT INTO SINH_VIEN VALUES ('SV01', 'Nguyễn Ngọc Thắng', '123', 'sv01@ictu.edu.vn', 'KTPM-K23A', 'Công nghệ thông tin', '2024-2028', 'ACTIVE', NULL)`);
    db.run(`INSERT INTO SINH_VIEN VALUES ('SV02', 'Trần Khả Quân', '123', 'sv02@ictu.edu.vn', 'KTPM-K23A', 'Công nghệ thông tin', '2024-2028', 'ACTIVE', NULL)`);
    db.run(`INSERT INTO SINH_VIEN VALUES ('SV03', 'Lý Văn Thuận', '123', 'sv03@ictu.edu.vn', 'KTPM-K23A', 'Công nghệ thông tin', '2024-2028', 'ACTIVE', NULL)`);
    db.run(`INSERT INTO SINH_VIEN VALUES ('SV04', 'Trần Khánh Liêm', '123', 'sv04@ictu.edu.vn', 'KTPM-K23A', 'Công nghệ thông tin', '2024-2028', 'ACTIVE', NULL)`);
    db.run(`INSERT INTO SINH_VIEN VALUES ('SV05', 'Mai Văn Đạt', '123', 'sv05@ictu.edu.vn', 'KTPM-K23A', 'Công nghệ thông tin', '2024-2028', 'ACTIVE', NULL)`);
    
    // SINH VIÊN KẾ TOÁN (Thêm Email)
    db.run(`INSERT INTO SINH_VIEN VALUES ('SV06', 'Lê Thị Hồng Nhung', '123', 'sv06@ictu.edu.vn', 'KT_K23A', 'Kế toán', '2024-2028', 'ACTIVE', NULL)`);
    db.run(`INSERT INTO SINH_VIEN VALUES ('SV07', 'Phạm Văn Hoàng', '123', 'sv07@ictu.edu.vn', 'KT_K23A', 'Kế toán', '2024-2028', 'ACTIVE', NULL)`);

    // MÔN HỌC & PHÂN CÔNG (Giữ nguyên logic đúng của V8)
    db.run(`INSERT INTO LOP_HOC_PHAN VALUES ('LHP01', 'Toán rời rạc', 'HK1', 'GV01', 'Công nghệ thông tin')`);
    db.run(`INSERT INTO LOP_HOC_PHAN VALUES ('LHP02', 'Xác suất thống kê', 'HK1', 'GV02', 'Công nghệ thông tin')`);
    db.run(`INSERT INTO LOP_HOC_PHAN VALUES ('LHP03', 'Phân tích thiết kế hệ thống', 'HK1', 'GV03', 'Công nghệ thông tin')`);
    db.run(`INSERT INTO LOP_HOC_PHAN VALUES ('LHP04', 'Triết học Mác-Lênin', 'HK1', 'GV04', 'ALL')`);
    db.run(`INSERT INTO LOP_HOC_PHAN VALUES ('LHP05', 'Kế toán tài chính', 'HK1', 'GV05', 'Kế toán')`);
    db.run(`INSERT INTO LOP_HOC_PHAN VALUES ('LHP06', 'Kế toán quản trị', 'HK1', 'GV06', 'Kế toán')`);

    // --- PHÂN CÔNG ĐÚNG ---
    const listSV_CNTT = ['SV01', 'SV02', 'SV03', 'SV04', 'SV05'];
    const listSV_KT = ['SV06', 'SV07'];
    const monCNTT = ['LHP01', 'LHP02', 'LHP03'];
    const monKT = ['LHP05', 'LHP06'];
    const monCHUNG = ['LHP04'];

    listSV_CNTT.forEach(sv => {
        [...monCNTT, ...monCHUNG].forEach(lop => {
            db.run(`INSERT INTO DANH_SACH_LOP (MaSV, MaLop) VALUES (?, ?)`, [sv, lop]);
            db.run(`INSERT INTO THEO_DOI_TIEN_DO (MaSV, MaLop, MaDot, TrangThai) VALUES (?, ?, 'DOT1', 'ChuaLam')`, [sv, lop]);
        });
    });

    listSV_KT.forEach(sv => {
        [...monKT, ...monCHUNG].forEach(lop => {
            db.run(`INSERT INTO DANH_SACH_LOP (MaSV, MaLop) VALUES (?, ?)`, [sv, lop]);
            db.run(`INSERT INTO THEO_DOI_TIEN_DO (MaSV, MaLop, MaDot, TrangThai) VALUES (?, ?, 'DOT1', 'ChuaLam')`, [sv, lop]);
        });
    });
    
    console.log("--- DATABASE ĐÃ SẴN SÀNG ---");
});

module.exports = db;