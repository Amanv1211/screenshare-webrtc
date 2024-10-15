# WebRTC Screen Sharing with Dynamic Session Id

This project demonstrates a WebRTC screen-sharing application where each session gets a dynamically assigned WebSocket server on a new session id currently it has range up to 2 peers (One sharer and other the viewer).

# Future update

Need to figure out how to make multiple viewers in a single session

## Setup Instructions

1. Clone the repository.
2. Navigate to the project directory.
3. Install the dependencies:


 ```On terminal
    sudo apt update
    sudo apt install snapd
    sudo snap install node --classic
    node --version **Check version for node**  
    npm --version **Check version for npm**

    mkdir screenshare
    cd screenshare
    npm init -y
    npm install socket.io
    npm install express

    touch server.js
    touch index.html
 ```
4. Run the port allocation server:

    ```On terminal
    node server.js
    ```

5. Open `https://192.168.0.13:8080/index.php?session_id={Whatever-ID-you-want}` to get a dynamically assigned WebSocket server for the screen-sharing session. 
6. Open `index.html` in the browser to start screen sharing.

## Folder Structure

- **app.example.com+3-key.pem&&app.example.com+3.pem** : Contains the SSL certificate and key files. **ForLocalhost**
- **index.html**: Contains static HTML and client-side scripts.
- **server.js**: WebSocket signaling server.
