const { app, BrowserWindow } = require('electron');
const path = require('path');
const electron = require('electron')

const {ipcRenderer} = require('electron');

// Enable live reload for all the files inside your project directory

const fs = require('fs');
const { domain } = require('process');


// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences:{
      nodeIntegration: true,
      enableRemoteModule: true
    }
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open the DevTools.
  //mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

const { ipcMain } = require( 'electron' );

const util = require('util');
const PDFParser = require('pdf2json');

var filesProcessed= 0; 

var messenger = false; 

ipcMain.on('edu-count', (event,data)=>{
  event.sender.send('edu-count', data);
});

ipcMain.on('com-count', (event,data)=>{
  event.sender.send('com-count', data);
});

ipcMain.on('other-count', (event,data)=>{
  event.sender.send('other-count', data);
});

ipcMain.on('mapped-edu-count', (event,data)=>{
  event.sender.send('mapped-edu-count', data);
});

const getPdf = (path) => {
  filesProcessed = 0; 
  return new Promise((resolve, reject) => {
    new PDFParser()
      .on( "pdfParser_dataError", errData => {
        console.log ("error with pdfParser " + path);
      })
      .on( "pdfParser_dataReady", pdfData => {
        filesProcessed ++; 
      
        messenger.sender.send('processed-files', filesProcessed);

        //console.log("processed " + path + " " + filesProcessed);
        resolve(pdfData);
      })
      .loadPDF( path );
  });
}

ipcMain.on( 'prefix-convert-pdf', ( event, paths ) => {
  messenger = event; 
  event.sender.send('total-files', paths.length);
  Promise.all(paths.map(getPdf))
  
  .then(pdfObjs=> event.sender.send('prefix-pdf-converted', pdfObjs ) );
});

  const {dialog}=require('electron')

  ipcMain.on('click-button',(event,arg)=>{

    if(arg=='true'){
      options = {properties: ['openDirectory']};
      dialog.showOpenDialog(null, options).then((filePath) => {
        console.log("FilePath is");
        if (filePath.canceled === true){
          event.sender.send( 'update-button-text', "Select PDF Folder");
        } else {
          event.sender.send( 'update-button-text', filePath['filePaths'][0]);
        }

        console.log(filePath);
        
    });
    }
  })
