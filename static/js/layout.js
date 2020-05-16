// If the user is not logged in, redirect to login page
if (!localStorage.getItem("user")) {
    location.href = "/login";
}

$(document).ready(function () {

    $("#sidebar").mCustomScrollbar({
        theme: "minimal"
    });

    $('#sidebarCollapse').on('click', function () {
        // open or close navbar
        $('#sidebar').toggleClass('active');
        // expand or contract the content
        $('#content').toggleClass('active');
        // close dropdowns
        $('.collapse.in').toggleClass('in');
        // and also adjust aria-expanded attributes we use for the open/closed arrows
        // in our CSS
        $('a[aria-expanded=true]').attr('aria-expanded', 'false');
    });

});

document.addEventListener('DOMContentLoaded', function () {

    // Set the page's username to the user in local storage
    document.querySelector("#nav-username").innerHTML = localStorage.getItem("user");

    // Add all the created channels to the channels drop down
    loadChannels();

    // Add all users to users drop down
    loadUsers();

    // Call this function when logout is clicked
    document.querySelector("#logout").addEventListener('click', () => {

        // Get the username from the form submission
        const user = localStorage.getItem("user");
        
        // Initialize new request
        const request = new XMLHttpRequest();
        request.open('POST', '/logout');

        // Callback function for when request completes
        request.onload = () => {

            // Extract JSON data from request
            const data = JSON.parse(request.responseText);

            // Update the user's status
            if (data.success) {
                // Clear all values from local storage (including user and current room)
                localStorage.clear();
                // Redirect user to login page
                location.href = "/login";
            }
            else {
                location.href = "/error";
            }
        }

        // Add data to send with request
        const data = new FormData();
        data.append('user', user);

        // Send request
        request.send(data);
    });

    // --------------------------------- Set up sockets -----------------------------------------------------------------------------
    // Connect to websocket
    var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

    // When connected, configure form for new channel
    socket.on('connect', () => {
        // Each form submit should emit a "submit message" event
        document.querySelector('#formCreateChannel').onsubmit = (event) => {
            event.preventDefault();

                // Get the channel name that the user inputted
            const channelName = document.querySelector("#channelName").value.toLowerCase();
            
            // If the channel name is just whitespace or empty, return an error
            if (channelName.indexOf(' ') >= 0 || channelName.length === 0) {
                event.preventDefault();
                document.querySelector("#createChannelError").textContent = "Please remove any whitespace.";
                return false;
            }

            // Emit the submit channel event event with the channel name
            socket.emit('submit channel', {'channelName': channelName});
        };
    });

    // When a received channel is announced, add it to the user interface
    socket.on('announce channel', data => {

        // Upon error, redirect to the error page
        if (data.error) {
            document.querySelector("#userMessage").value = '';
            location.href = '/error';
        }

        // Get the field from the socket announcement
        const channelName = data.channel_name;

        // If the channel name is empty, this means that it already exists so show an error message
        if (channelName == '') {
            // Create an error message
            document.querySelector("#createChannelError").textContent = "That channel already exists.";
            return false;
        }

        // Set the modal back to defaults
        document.querySelector("#createChannelError").textContent = "";
        document.querySelector("#channelName").value = "";
        
        // Create a tag with href pointing to new chat and append to an li. Append that li to the channels dropdown
        const aChannelItem = document.createElement('a');
        aChannelItem.innerHTML = channelName;
        aChannelItem.href = `#${channelName}`;
        const liChannelItem = document.createElement('li');
        liChannelItem.append(aChannelItem);
        document.querySelector("#channelsSubmenu").append(liChannelItem);

        // Hide the modal
        $('#createChannelModal').modal('hide');
    });
});

// Add all the created channels to the channels drop down
loadChannels = () => {
    // Initialize new request
    const request = new XMLHttpRequest();
    request.open('GET', '/getChannels');

    // Callback function for when request completes
    request.onload = () => {

        // Extract JSON data from request
        const data = JSON.parse(request.responseText);
        
        // On success, add the channel name to the channel names drop down
        if (data.channels) {
            const channels = data.channels;

            // Add each channel to the channel dropdown
            channels.forEach(channel => {
                const aChannelItem = document.createElement('a');
                aChannelItem.innerHTML = channel;
                aChannelItem.href = `#${channel}`;
                const liChannelItem = document.createElement('li');
                liChannelItem.append(aChannelItem);
                document.querySelector("#channelsSubmenu").append(liChannelItem);
            });
        }
    }
    // Send request
    request.send();
}

// Add all the users to the users drop down
loadUsers = () => {
    // Initialize new request
    const request = new XMLHttpRequest();
    request.open('GET', '/getUsers');

    // Callback function for when request completes
    request.onload = () => {

        // Extract JSON data from request
        const data = JSON.parse(request.responseText);
        
        // On success, add the channel name to the channel names drop down
        if (data.users) {
            const users = data.users;

            // Clear all list items from the list
            document.querySelector("#usersSubmenu").innerHTML = '';

            // Add each channel to the channel dropdown
            users.forEach(user => {
                const aUserItem = document.createElement('a');
                aUserItem.innerHTML = user;
                aUserItem.href = `#`;
                const liUserItem = document.createElement('li');
                liUserItem.append(aUserItem);
                document.querySelector("#usersSubmenu").append(liUserItem);
            });
        }
    }
    // Send request
    request.send();
}
