import os, json, time

from flask import Flask, render_template, request, redirect, url_for, session,jsonify
from flask_session import Session
from flask_socketio import SocketIO, emit

from helpers import login_required

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

# Configure session to use filesystem
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)

# Global variables
users = []
channels = []
messages = [{}]

@app.route('/error')
def error():
   return render_template('error.html')


@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")


@app.route('/signup', methods=["GET", "POST"])
def signup():
    if request.method == "GET":
        return render_template('signup.html')
    
    if request.method == "POST":
    
        # Get the user from the request
        user = request.form.get("user")

        # Check for errors
        if not user or user in users:
            return jsonify({"success": False})
        
        # Add user to the list of usernames
        users.append(user)
        return jsonify({"success": True})
   

@app.route('/login', methods=["GET", "POST"])
def login():
    if request.method == "GET":
        return render_template('login.html')
    
    if request.method == "POST":
        # Get the user from the request
        user = request.form.get("user")

        # Check for errors
        if not user or user not in users:
            return jsonify({"success": False})
        
        return jsonify({"success": True})


@app.route('/logout', methods=["POST"])
def logout():
   
    # Get the user from the request
    user = request.form.get("user")

    # Check for errors
    if not user or user not in users:
        return jsonify({"success": False})
    
    return jsonify({"success": True})


@app.route('/chat')
def chat():
   return render_template("chat.html")


@app.route('/createChannel', methods=["POST"])
def createChannel():

    # Get the channel name from the request
    channelName = request.form.get("channelName")

    # If the channel name already exists, return an error
    if not channelName or channelName in channels:
        return jsonify({"success": False})
    
    # Add the channel name to the list of channels, return True
    channels.append(channelName)
    messages[0].update({channelName: []})
    return jsonify({"success": True})


@app.route('/getChannels', methods=["GET"])
def getChannels():
   return jsonify({"channels": channels})


@app.route('/getUsers', methods=["GET"])
def getUsers():
   return jsonify({"users": users})


@app.route('/getMessages', methods=["POST"])
def method_name():
    if not messages or not request.form.get("channel"):
        return jsonify({'messages': []})

    channel = request.form.get("channel")
    channelMessages = messages[0]
    if channel not in channelMessages:
        return jsonify({'messages': []})

    data = []
    start = 0
    end = start + 100
    if request.form.get("start").isdigit():
        start = int(request.form.get("start"))
        end = start + 100
    

    data = channelMessages[channel][start:end]
    return jsonify({'messages': data, "length": len(data)})

@app.route('/sendMessage', methods=["POST"])
def sendMessage():
    if not request.form.get("message") or not request.form.get("user") or not request.form.get("channel"):
       return jsonify({"success": False})
    
    message = {
        "user": request.form["user"],
        "content": request.form["message"]
    }
    channel = request.form["channel"]

    if channel not in channels:
        return jsonify({"success": False})

    messages[0][channel].append(message)
    return jsonify({"success": True})


@socketio.on("submit message")
def messageReceived(data):

    # Check that all fields exist
    if not data or not data["user"] or not data["message"] or not data["channel"]:
        emit("announce message", {"error": True})
        return
    
    # Get all fields from data
    message = {
        "user": data["user"],
        "content": data["message"]
    }
    channel = data["channel"]

    # Check that there the channel exists in the messages
    if channel not in messages[0]:
        emit("announce message", {"error": True})
        return

    # Append the new message for the channel
    messages[0][channel].append(message)

    # Emit the new message to all users
    emit("announce message", {"message": message, "channel": channel}, broadcast=True)


@socketio.on("submit channel")
def newChannel(data):

    # Check that all fields exist
    if not data or not data["channelName"]:
        emit("announce channel", {"error": True})
        return
    
    # Get the field from the data
    channel_name = data["channelName"]

    # If channel already exists, return an empty channel name
    if channel_name in channels:
        emit("announce channel", {"channel_name": ''})
        return
    
    # Add the channel to the channels list and create a section for it in the messages
    channels.append(channel_name)
    messages[0].update({channel_name: []})

    # Emit the new channel to all users
    emit("announce channel", {"channel_name": channel_name}, broadcast=True)

