import React from 'react';
import ReactDOM from 'react-dom';
import SeafileEditor from './lib/seafile-editor';
import Tree from './tree-view/tree';
import 'whatwg-fetch';

let repoID = window.app.pageOptions.repoID;
let filePath = window.app.pageOptions.filePath;
let fileName = window.app.pageOptions.fileName;
let siteRoot = window.app.config.siteRoot;
let domain = window.app.pageOptions.domain;
let protocol = window.app.pageOptions.protocol;

let dirPath = '/';

const updateUrl = `${siteRoot}api2/repos/${repoID}/update-link/?p=${dirPath}`;
const uploadUrl = `${siteRoot}api2/repos/${repoID}/upload-link/?p=${dirPath}`;

function updateFile(uploadLink, filePath, fileName, content) {
  var formData = new FormData();
  formData.append("target_file", filePath);
  formData.append("filename", fileName);
  var blob = new Blob([content], { type: "text/plain"});
  formData.append("file", blob);
  return fetch(uploadLink, {
    method: "POST",
    body: formData,
    mode: 'no-cors',
  });
}

function getImageFileNameWithTimestamp() {
  var d = Date.now();
  return "image-" + d.toString() + ".png";
}

class EditorUtilities {
  saveContent(content) {
    return (fetch(updateUrl, {credentials: 'same-origin'})
      .then(res => res.json())
      .then(res => {
        return updateFile(res, filePath, fileName, content)
      })
    );
  }

  _getImageURL(fileName) {
    const url = `${protocol}://${domain}${siteRoot}lib/${repoID}/file/images/${fileName}?raw=1`;
    return url;
  }

  uploadImage = (imageFile) =>
    fetch(uploadUrl, {credentials: 'same-origin'})
      .then(res => res.json())
      .then(res => {
        const uploadLink = res + "?ret-json=1";
        // change image file name
        const name = getImageFileNameWithTimestamp();
        const blob = imageFile.slice(0, -1, 'image/png');
        const newFile = new File([blob], name, {type: 'image/png'});
        const formData = new FormData();
        formData.append("parent_dir", "/");
        formData.append("relative_path", "images");
        formData.append("file", newFile);
        // upload the image

        return fetch(uploadLink, {
          method: "POST",
          body: formData,
        })
      })
    .then(res => res.json())
    .then(json => this._getImageURL(json[0].name))

  getFileURL(fileNode) {
    var url;
    if (fileNode.isImage()) {
      url = protocol + '://' + domain + siteRoot + "lib/" + repoID + "/file" + fileNode.path() + "?raw=1";
    } else {
      url = protocol + '://' + domain + siteRoot + "lib/" + repoID + "/file" + fileNode.path();
    }
    return url;
  }
  
  isInternalFileLink(url) {
    var re = new RegExp( protocol + '://' + domain + siteRoot + "/lib/" + "[0-9a-f\-]{36}/file.*");
    return re.test(url);
  }

  getFiles() {
    const dirUrl = `${siteRoot}api2/repos/${repoID}/dir/?p=${dirPath}&recursive=1`
    return fetch(dirUrl, {credentials: 'same-origin'})
      .then(res => res.json())
      .then(items => {
        const files = items.map(item => {
          return {
            name: item.name,
            type: item.type === 'dir' ? 'dir' : 'file',
            isExpanded: item.type === 'dir' ? true : false,
            parent_path: item.parent_dir,
          }
        })
        return files;
      })
  }
}



const editorUtilities = new EditorUtilities();

class App extends React.Component {
  constructor(props) {
      super(props);
      this.state = {
        markdownContent: "",
        loading: true,
      };
    }

  componentDidMount() {
    const url = `${siteRoot}api2/repos/${repoID}/file/?p=${filePath}&reuse=1`;
    fetch(url, {credentials: 'same-origin'})
      .then(res => res.json())
      .then(res => {
        fetch(res)
          .then(response => response.text())
          .then(body => {
            this.setState({
              markdownContent: body,
              loading: false
            })
        });
      })
  }

  render() {
    if (this.state.loading) {
      return (
        <div className="empty-loading-page">
          <div className="lds-ripple page-centered"><div></div><div></div></div>
        </div>
      )
    } else {
      return (
        <SeafileEditor
          markdownContent={this.state.markdownContent}
          editorUtilities={editorUtilities}
        />
      );
    }
  }
}

export default App;
