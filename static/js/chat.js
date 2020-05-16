// Remove all chat messages from div
clearChat = () => {
    document.querySelector(".msg_history").innerHTML = '';
    counter = 0;
    localStorage.removeItem("channel");
}

// Load all chats for the current channel
loadChat = () => {
    const channel = location.hash.substr(1);

    // Initialize new request
    const request = new XMLHttpRequest();
    request.open("POST", "/getMessages");

    // Callback function for when request completes
    request.onload = () => {

        // Extract JSON data from request
        const data = JSON.parse(request.responseText);
        
        if (data.messages) {
            localStorage.setItem("channel", channel);

            const messages = data.messages;
            const currentUser = localStorage.getItem("user");

            messages.forEach(message => {
                if (message.user === currentUser) {
                    createOutgoingMessage(message.user, message.content);
                }
                else {
                    createIncomingMessage(message.user, message.content);
                }
            });

            if (counter === 0) {
                // Automatically scroll to bottom of chat
                const messagesDiv = document.querySelector(".msg_history");
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
            else {
                // Automatically scroll to last hundred messages
                const scrollToNode = messages.length;
                document.querySelector(".msg_history").childNodes[scrollToNode].scrollIntoView();
            }
            counter += messages.length;
        }
    }

    // These will be undefined the first time the code runs so we start the counter at 100
    start = counter;

    // Add data to send with request
    const data = new FormData();
    data.append("channel", channel);
    data.append("start", start);

    // Send request
    request.send(data);

}

// Create an incoming chat message
createIncomingMessage = (user, content) => {
    incoming_msg = document.createElement("div");
    incoming_msg.className = "incoming_msg";
    
    received_msg = document.createElement("div");
    received_msg.className = "received_msg";

    received_withd_msg = document.createElement("div");
    received_withd_msg.className = "received_withd_msg";

    content_p = document.createElement("p");
    content_p.innerHTML = content;

    span_username = document.createElement("span");
    span_username.innerHTML = user;
    span_username.className = "message_username";

    received_withd_msg.appendChild(span_username);
    received_withd_msg.appendChild(content_p);

    received_msg.appendChild(received_withd_msg);

    incoming_msg.appendChild(received_msg);

    document.querySelector(".msg_history").appendChild(incoming_msg);
    document.querySelector(".msg_history").childNodes[document.querySelector(".msg_history").childNodes.length - 1].scrollIntoView()
}

// Create an outgoing chat message
createOutgoingMessage = (user, content, sendingMessage = false) => {
    outgoing_msg = document.createElement("div");
    outgoing_msg.className = "outgoing_msg";

    sent_msg = document.createElement("div");
    sent_msg.className = "sent_msg";

    message_username = document.createElement("span");
    message_username.innerHTML = user;
    message_username.className = "message_username";

    content_p = document.createElement("p");
    content_p.innerHTML = content;

    sent_msg.appendChild(message_username);
    sent_msg.appendChild(content_p);

    outgoing_msg.appendChild(sent_msg);

    if (sendingMessage) {
        document.querySelector(".msg_history").appendChild(outgoing_msg);
        // Automatically scroll to bottom of chat
        const messagesDiv = document.querySelector(".msg_history");
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
    else {
        document.querySelector(".msg_history").appendChild(outgoing_msg);
        // document.querySelector(".msg_history").insertBefore(outgoing_msg, document.querySelector(".msg_history").childNodes[0]);
    }
}

// When the user reloads the page, this will update the messages
if (location.hash.length > 0) {
    clearChat();
    loadChat();
}

// When the user first joins a channel, this will update the messages
window.addEventListener('hashchange', () => {
    clearChat();
    if (location.hash.length > 0) {
        loadChat();
    }
});

// Add event listener to load more messages when user scrolls to the top of the message container
document.addEventListener('DOMContentLoaded', () => {

    // Load more messages when the user scrolls to the top of the message box
    document.querySelector(".msg_history").addEventListener('scroll', () => {
        if (document.querySelector(".msg_history").scrollTop === 0) {
            if (counter !== 0) {
                loadChat();
            }
        }
    });

    // On message send, check for valid message and send
    // Call this function on form submit
    // document.querySelector('#messageForm').onsubmit = (event) => {
    //     // Make sure the form doesn't load a new page
    //     event.preventDefault();

    //     // Get the message from the form submission
    //     const message = document.querySelector('#userMessage').value;
        
    //     // Initialize new request
    //     const request = new XMLHttpRequest();
    //     request.open('POST', '/sendMessage');

    //     // Callback function for when request completes
    //     request.onload = () => {

    //         // Extract JSON data from request
    //         const data = JSON.parse(request.responseText);
            
    //         // Update the user's status
    //         if (data.success) {
    //             createOutgoingMessage(localStorage.getItem("user"), message, sendingMessage = true);
    //             document.querySelector("#userMessage").value = '';
    //         }
    //         else {
    //             document.querySelector("#userMessage").value = '';
    //             location.href = "/error";
    //         }
    //     }

    //     // Add data to send with request
    //     const data = new FormData();
    //     data.append('message', message);
    //     data.append('user', localStorage.getItem("user"));
    //     data.append('channel', localStorage.getItem("channel"));

    //     // Send request
    //     request.send(data);
    //     return false;
    // };

    // --------------------------------- Set up sockets -----------------------------------------------------------------------------
    // Connect to websocket
    var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

    // When connected, configure form
    socket.on('connect', () => {

        // Each form submit should emit a "submit message" event
        document.querySelector('#messageForm').onsubmit = (event) => {
            // Prevent default form behaviour
            event.preventDefault();

            // Get the message from the form submission
            const message = document.querySelector('#userMessage').value;

            // Check that the message is empty
            if (message === null || message.match(/^ *$/) !== null) {
                return false;
            }
            
            // Emit the submit message event with the message, user and channel
            socket.emit('submit message', {'message': message, 'user': localStorage.getItem('user'), 'channel': localStorage.getItem('channel')});
        };
    });

    // When a received message is announced, add it to the user interface
    socket.on('announce message', data => {
        // Upon error, redirect to the error page
        if (data.error) {
            document.querySelector("#userMessage").value = '';
            location.href = '/error';
        }

        // Get all fields from the socket announcement
        const message = data.message;
        const content = message.content;
        const user = message.user;
        const channel = data.channel

        // If the announcement is for another channel, ignore it
        if (localStorage.getItem("channel") != channel) {
            return false;
        }

        // If the received message's user matches the current user, set sendingMessage to true
        if (user == localStorage.getItem('user')) {
            // Add new outgoing message to user interface
            createOutgoingMessage(localStorage.getItem("user"), content, sendingMessage = true);
        }
        else {
            // Add new incoming message to user interface
            createIncomingMessage(user, content);
        }
        // Clear the message input box
        document.querySelector("#userMessage").value = '';
    });
})
