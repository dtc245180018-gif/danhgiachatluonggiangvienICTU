const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const db = require('./database');
const nodemailer = require('nodemailer');
const path = require('path'); // <--- 1. THÊM DÒNG NÀY
const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(bodyParser.json());

// Đảm bảo đường dẫn tĩnh trỏ đúng vào thư mục public
app.use(express.static(path.join(__dirname, 'public'))); 

// --- 3. THÊM ĐOẠN CODE QUAN TRỌNG NÀY ---
// Đoạn này giúp sửa lỗi "Cannot GET /"
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
// --- CẤU HÌNH GỬI MAIL ---
// Để test: Dùng jsonTransport: true (In ra màn hình console)
// Để chạy thật: Thay bằng service: 'gmail', auth: { user: '...', pass: '...' }
const transporter = nodemailer.createTransport({
    jsonTransport: true 
});

// --- API QUÊN MẬT KHẨU (MỚI) ---
app.post('/api/forgot-password', (req, res) => {
    const { email } = req.body;
    
    // 1. Tìm trong bảng SINH VIÊN
    db.get(`SELECT MaSV as ID, HoTen, MatKhau FROM SINH_VIEN WHERE Email = ?`, [email], (err, sv) => {
        if (sv) {
            return sendRecoveryEmail(sv.HoTen, email, sv.MatKhau, res);
        }
        
        // 2. Nếu không thấy, tìm trong bảng GIẢNG VIÊN
        db.get(`SELECT MaGV as ID, HoTen, MatKhau FROM GIANG_VIEN WHERE Email = ?`, [email], (err, gv) => {
            if (gv) {
                return sendRecoveryEmail(gv.HoTen, email, gv.MatKhau, res);
            }
            // Không tìm thấy
            res.json({ success: false, message: "Email này không tồn tại trong hệ thống!" });
        });
    });
});

function sendRecoveryEmail(name, email, pass, res) {
    const mailOptions = {
        from: '"Hệ thống ICTU" <admin@ictu.edu.vn>',
        to: email,
        subject: 'Khôi phục mật khẩu - Cổng Đánh Giá',
        text: `Xin chào ${name},\n\nMật khẩu của bạn là: ${pass}\n\nVui lòng bảo mật thông tin này.\nTrân trọng.`
    };

    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.log("Lỗi gửi mail:", err);
            return res.json({ success: false, message: "Lỗi hệ thống gửi mail!" });
        }
        // Log ra console để bạn test
        console.log("========================================");
        console.log(`📧 GỬI EMAIL KHÔI PHỤC CHO: ${email}`);
        console.log(`🔑 MẬT KHẨU LÀ: ${pass}`);
        console.log("========================================");
        
        res.json({ success: true, message: `Mật khẩu đã được gửi đến email: ${email}\n(Hãy kiểm tra Console của Server nếu đang chạy thử nghiệm)` });
    });
}

// --- CÁC API KHÁC (GIỮ NGUYÊN) ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const checkLock = (user, role) => { if (user.TrangThai === 'LOCKED') return { success: false, message: `Tài khoản bị KHÓA. Lý do: ${user.LyDoKhoa}` }; return { success: true, role, user }; }
    db.get(`SELECT * FROM ADMIN WHERE UserID = ? AND MatKhau = ?`, [username, password], (err, row) => {
        if (row) return res.json({ success: true, role: 'ADMIN', user: row });
        db.get(`SELECT * FROM GIANG_VIEN WHERE MaGV = ? AND MatKhau = ?`, [username, password], (err, row) => {
            if (row) return res.json(checkLock(row, 'GV'));
            db.get(`SELECT * FROM SINH_VIEN WHERE MaSV = ? AND MatKhau = ?`, [username, password], (err, row) => {
                if (row) return res.json(checkLock(row, 'SV'));
                res.json({ success: false, message: "Sai tài khoản hoặc mật khẩu!" });
            });
        });
    });
});

app.post('/api/change-password', (req, res) => {
    const { id, oldPass, newPass, role } = req.body;
    const table = role === 'SV' ? 'SINH_VIEN' : (role === 'GV' ? 'GIANG_VIEN' : 'ADMIN');
    const idCol = role === 'SV' ? 'MaSV' : (role === 'GV' ? 'MaGV' : 'UserID');
    db.get(`SELECT * FROM ${table} WHERE ${idCol} = ? AND MatKhau = ?`, [id, oldPass], (err, row) => {
        if (!row) return res.json({ success: false, message: "Mật khẩu cũ không đúng!" });
        db.run(`UPDATE ${table} SET MatKhau = ? WHERE ${idCol} = ?`, [newPass, id], (err) => res.json({ success: true, message: "Đổi mật khẩu thành công!" }));
    });
});

app.get('/api/admin/users', (req, res) => {
    const search = req.query.q ? `%${req.query.q}%` : '%';
    const sql = `SELECT MaSV as ID, HoTen, 'Sinh Viên' as Role, LopSH as Info1, Khoa as Info2, TrangThai, LyDoKhoa FROM SINH_VIEN WHERE MaSV LIKE ? OR HoTen LIKE ? UNION ALL SELECT MaGV as ID, HoTen, 'Giảng Viên' as Role, DonViCongTac as Info1, HocVi as Info2, TrangThai, LyDoKhoa FROM GIANG_VIEN WHERE MaGV LIKE ? OR HoTen LIKE ?`;
    db.all(sql, [search, search, search, search], (err, rows) => res.json(rows));
});

app.post('/api/admin/lock-user', (req, res) => {
    const { id, role, action, reason } = req.body;
    const table = role === 'Sinh Viên' ? 'SINH_VIEN' : 'GIANG_VIEN';
    const colID = role === 'Sinh Viên' ? 'MaSV' : 'MaGV';
    db.run(`UPDATE ${table} SET TrangThai = ?, LyDoKhoa = ? WHERE ${colID} = ?`, [action === 'LOCK' ? 'LOCKED' : 'ACTIVE', action === 'LOCK' ? reason : null, id], (err) => res.json({ success: true }));
});

app.post('/api/admin/bulk-action', (req, res) => {
    db.serialize(() => {
        const s = req.body.action==='LOCK_ALL'?'LOCKED':'ACTIVE'; const r=req.body.action==='LOCK_ALL'?req.body.reason:null;
        db.run(`UPDATE SINH_VIEN SET TrangThai=?, LyDoKhoa=?`,[s,r]); db.run(`UPDATE GIANG_VIEN SET TrangThai=?, LyDoKhoa=?`,[s,r]);
    }); res.json({ success: true });
});

app.get('/api/admin/settings', (req, res) => { db.get(`SELECT * FROM DOT_DANH_GIA LIMIT 1`, (err, row) => res.json(row)); });
app.post('/api/admin/update-time', (req, res) => { db.run(`UPDATE DOT_DANH_GIA SET DenNgay = ?`, [req.body.denNgay], (err) => res.json({ success: true })); });

// BROADCAST
app.post('/api/admin/broadcast', (req, res) => {
    const { tieuDe, noiDung } = req.body;
    db.run(`INSERT INTO THONG_BAO (TieuDe, NoiDung) VALUES (?, ?)`, [tieuDe, noiDung]);
    console.log(`[BROADCAST] ${tieuDe}: ${noiDung}`);
    res.json({ success: true, message: "Đã gửi thông báo!" });
});
app.get('/api/notifications', (req, res) => { db.all(`SELECT * FROM THONG_BAO WHERE HienThi = 1 ORDER BY ID DESC LIMIT 1`, (err, rows) => res.json(rows)); });

// QUESTIONS
app.get('/api/admin/questions', (req, res) => { db.all(`SELECT * FROM TIEU_CHI ORDER BY MaTieuChi`, (err, rows) => res.json(rows)); });
app.post('/api/admin/question', (req, res) => { 
    const { id, content } = req.body;
    if (id) db.run(`UPDATE TIEU_CHI SET NoiDungCauHoi = ? WHERE MaTieuChi = ?`, [content, id], (err) => res.json({ success: true }));
    else db.run(`INSERT INTO TIEU_CHI (MaBo, NoiDungCauHoi, DiemToiDa) VALUES ('BO01', ?, 5)`, [content], (err) => res.json({ success: true }));
});
app.delete('/api/admin/question/:id', (req, res) => { db.run(`DELETE FROM TIEU_CHI WHERE MaTieuChi = ?`, [req.params.id], (err) => res.json({ success: true })); });

// SYNC
app.post('/api/admin/sync-school-data', (req, res) => {
    fs.readFile('./school_data.json', 'utf8', (err, data) => {
        if (err) return res.json({ success: false, message: "Lỗi file data!" });
        const sd = JSON.parse(data); let c = 0;
        db.serialize(() => {
            const stmtSV = db.prepare(`INSERT OR REPLACE INTO SINH_VIEN (MaSV, HoTen, MatKhau, LopSH, Khoa, NienKhoa, Email) VALUES (?, ?, '123', ?, ?, ?, ?)`);
            const stmtGV = db.prepare(`INSERT OR REPLACE INTO GIANG_VIEN (MaGV, HoTen, MatKhau, HocVi, DonViCongTac, Email) VALUES (?, ?, '123', ?, ?, ?)`);
            const stmtLop = db.prepare(`INSERT OR REPLACE INTO LOP_HOC_PHAN (MaLop, TenMonHoc, HocKy, MaGV, Khoa) VALUES (?, ?, ?, ?, ?)`);
            sd.forEach(item => {
                if(item.type === 'SINH_VIEN') { 
                    let k = item.data.Khoa || 'KHAC'; if(k === 'CNTT') k = 'Công nghệ thông tin'; if(k === 'KT' || k === 'Kế Toán') k = 'Kế toán';
                    const email = item.data.Email || `${item.data.MaSV.toLowerCase()}@ictu.edu.vn`;
                    stmtSV.run(item.data.MaSV, item.data.HoTen, item.data.LopSH, k, item.data.NienKhoa, email); 
                    db.run(`DELETE FROM DANH_SACH_LOP WHERE MaSV=?`,[item.data.MaSV]); db.run(`DELETE FROM THEO_DOI_TIEN_DO WHERE MaSV=?`,[item.data.MaSV]); c++; 
                } else if (item.type === 'GIANG_VIEN') { 
                    const email = item.data.Email || `${item.data.MaGV.toLowerCase()}@ictu.edu.vn`;
                    stmtGV.run(item.data.MaGV, item.data.HoTen, item.data.HocVi||'GV', item.data.DonViCongTac||'KHAC', email); c++; 
                } else if (item.type === 'LOP_HOC_PHAN') { 
                    let k = item.data.Khoa || 'ALL'; if(k === 'CNTT') k = 'Công nghệ thông tin'; if(k === 'KT') k = 'Kế toán';
                    stmtLop.run(item.data.MaLop, item.data.TenMon, item.data.HocKy, item.data.MaGV, k); c++; 
                }
            });
            stmtSV.finalize(); stmtGV.finalize(); stmtLop.finalize();
            db.run(`INSERT OR IGNORE INTO DANH_SACH_LOP (MaSV, MaLop) SELECT s.MaSV, l.MaLop FROM SINH_VIEN s JOIN LOP_HOC_PHAN l ON (s.Khoa = l.Khoa OR l.Khoa = 'ALL')`);
            db.run(`INSERT OR IGNORE INTO THEO_DOI_TIEN_DO (MaSV, MaLop, MaDot, TrangThai) SELECT s.MaSV, l.MaLop, 'DOT1', 'ChuaLam' FROM SINH_VIEN s JOIN LOP_HOC_PHAN l ON (s.Khoa = l.Khoa OR l.Khoa = 'ALL')`);
        });
        setTimeout(() => res.json({ success: true, message: `Đồng bộ xong ${c} dòng.` }), 2000);
    });
});

// ANALYTICS & CLIENT
app.get('/api/analytics', (req, res) => {
    const { magv } = req.query; let sql = `SELECT L.TenMonHoc, G.HoTen as TenGV, G.MaGV, CT.DiemSo, T.NoiDungCauHoi, P.MaPhieu, P.YKienKhac FROM CHI_TIET_KET_QUA CT JOIN PHIEU_KET_QUA P ON CT.MaPhieu = P.MaPhieu JOIN TIEU_CHI T ON CT.MaTieuChi = T.MaTieuChi JOIN LOP_HOC_PHAN L ON P.MaLop = L.MaLop JOIN GIANG_VIEN G ON L.MaGV = G.MaGV`; if(magv) sql += ` WHERE G.MaGV = '${magv}'`;
    db.all(sql, (err, rows) => {
        let map = {}; rows.forEach(r => { const k = r.TenGV + '|' + r.TenMonHoc; if(!map[k]) map[k] = { total: 0, count: 0, details: {}, comments: [], seen: new Set() }; map[k].total += r.DiemSo; map[k].count++; if(!map[k].details[r.NoiDungCauHoi]) map[k].details[r.NoiDungCauHoi] = []; map[k].details[r.NoiDungCauHoi].push(r.DiemSo); if(!map[k].seen.has(r.MaPhieu)) { map[k].seen.add(r.MaPhieu); if(r.YKienKhac) map[k].comments.push(r.YKienKhac); } });
        const rep = Object.keys(map).map(k => { const [g, m] = k.split('|'); const d = map[k]; const avg5 = d.total / d.count; const percent = (avg5 / 5) * 100; let det = {}; for(let q in d.details) det[q] = (d.details[q].reduce((a,b)=>a+b,0)/d.details[q].length).toFixed(1); return { TenGV: g, TenMon: m, DiemTB: avg5.toFixed(2), PhanTram: percent.toFixed(1), ChiTiet: det, Comments: d.comments }; });
        db.get(`SELECT (SELECT COUNT(*) FROM SINH_VIEN) as Tong, (SELECT COUNT(DISTINCT MaSV) FROM THEO_DOI_TIEN_DO WHERE TrangThai='DaLam') as DaLam`, (err, p) => res.json({ progress: p, reports: rep }));
    });
});
app.get('/api/admin/progress', (req, res) => { const sql = `SELECT s.MaSV, s.HoTen as TenSV, s.LopSH, l.TenMonHoc, l.MaLop, g.HoTen as TenGV, t.TrangThai FROM THEO_DOI_TIEN_DO t JOIN SINH_VIEN s ON t.MaSV = s.MaSV JOIN LOP_HOC_PHAN l ON t.MaLop = l.MaLop JOIN GIANG_VIEN g ON l.MaGV = g.MaGV ORDER BY t.TrangThai ASC, s.LopSH ASC`; db.all(sql, (err, rows) => { if(err)return res.json([]); const stats={total:rows.length,done:rows.filter(r=>r.TrangThai==='DaLam').length,pending:rows.filter(r=>r.TrangThai!=='DaLam').length}; res.json({stats,items:rows}); }); });
app.get('/api/sv/tasks/:masv', (req, res) => { const fix = `INSERT OR IGNORE INTO THEO_DOI_TIEN_DO (MaSV, MaLop, MaDot, TrangThai) SELECT '${req.params.masv}', l.MaLop, 'DOT1', 'ChuaLam' FROM LOP_HOC_PHAN l, SINH_VIEN s WHERE s.MaSV='${req.params.masv}' AND (s.Khoa=l.Khoa OR l.Khoa='ALL')`; db.run(fix); db.get(`SELECT * FROM DOT_DANH_GIA`, (err, dot) => { const today = new Date().toISOString().split('T')[0]; if (dot.TrangThai !== 'OPEN' || today > dot.DenNgay) return res.json({ isOpen: false, message: `Hết hạn: ${dot.DenNgay}` }); const sql = `SELECT L.MaLop, L.TenMonHoc, G.HoTen as TenGV, T.TrangThai FROM THEO_DOI_TIEN_DO T JOIN LOP_HOC_PHAN L ON T.MaLop = L.MaLop JOIN GIANG_VIEN G ON L.MaGV = G.MaGV WHERE T.MaSV = ? AND T.MaDot = ?`; db.all(sql, [req.params.masv, dot.MaDot], (err, rows) => res.json({ isOpen: true, tasks: rows, maDot: dot.MaDot })); }); });
app.get('/api/questions', (req, res) => { db.all(`SELECT * FROM TIEU_CHI WHERE MaBo = 'BO01'`, (err, rows) => res.json(rows)); });
app.post('/api/sv/submit', (req, res) => { const { masv, malop, madot, answers, ykien } = req.body; db.serialize(() => { db.run(`INSERT INTO PHIEU_KET_QUA (MaLop, MaDot, YKienKhac) VALUES (?, ?, ?)`, [malop, madot, ykien], function() { const mp = this.lastID; const stmt = db.prepare(`INSERT INTO CHI_TIET_KET_QUA (MaPhieu, MaTieuChi, DiemSo) VALUES (?, ?, ?)`); answers.forEach(a => stmt.run(mp, a.maTieuChi, a.diem)); stmt.finalize(); db.run(`UPDATE THEO_DOI_TIEN_DO SET TrangThai='DaLam', ThoiGianHoanThanh=CURRENT_TIMESTAMP WHERE MaSV=? AND MaLop=? AND MaDot=?`, [masv, malop, madot]); res.json({ success: true }); }); }); });

app.listen(PORT, () => { console.log(`Server V11.0 running at http://localhost:${PORT}`); });
app.listen(PORT, () => { console.log(`Server running at http://localhost:${PORT}`); });