// ============================================================
// TORACO — Electron Main Process
// ============================================================
// File này là entry point của app desktop.
// Electron chạy file này trước, rồi tạo cửa sổ và load index.html vào đó.
// localStorage trong Electron lưu vào AppData/Roaming/toraco/ — không bao giờ bị browser clear.

const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width:     1280,
    height:    900,
    minWidth:  960,
    minHeight: 720,
    title:     'Toraco',
    backgroundColor: '#0a0a1a',   // màu nền trong lúc load (khớp với game)
    webPreferences: {
      nodeIntegration: false,     // tắt Node trong renderer (bảo mật)
      contextIsolation: true,
    },
  });

  win.loadFile('index.html');
  win.setMenuBarVisibility(false); // ẩn menu File/Edit/View của Electron
}

app.whenReady().then(() => {
  createWindow();

  // macOS: click dock icon khi chưa có cửa sổ → mở lại
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Windows/Linux: đóng tất cả cửa sổ → thoát app
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
