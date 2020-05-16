document.addEventListener('DOMContentLoaded', function() {

    // Call this function on form submit
    document.querySelector('#form').onsubmit = () => {

        // Get the username from the form submission
        const user = document.querySelector('#username').value.toLowerCase();
        
        // Initialize new request
        const request = new XMLHttpRequest();
        request.open('POST', '/signup');

        // Callback function for when request completes
        request.onload = () => {

            // Extract JSON data from request
            const data = JSON.parse(request.responseText);
            
            // Update the user's status
            if (data.success) {
                localStorage.setItem("user", user);
                location.href = "/chat";
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
        return false;
    };
});

// If a user closes the page and returns to the app later, the display name will be remembered and they will be redirected to the chat page
if (localStorage.getItem("user")) {
    location.href = "/chat";
}