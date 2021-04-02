const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter =  require('bad-words')
const { generateMessage } = require('./utils/messages')
const { generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom} = require('./utils/users')


const app = express()
const server = http.createServer(app)
const io = socketio(server)

port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))

const msg = "Welcome"

io.on('connection', (socket) => {
    console.log('New Websocket connection!')



    socket.on('join', ({ username, room }, callback) => {

        const { error, user } = addUser({ id: socket.id, username, room })

        if(error){
            return callback(error)
        }
        socket.join(user.room)

        socket.emit('message', generateMessage('admin', `${user.username} welcome!`))
        socket.broadcast.to(user.room).emit('message', generateMessage('admin',`${user.username} has joined!`))


        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })
    


    
    socket.on('sendMessage', (message, callback) => {
        const filter = new Filter()

        if(filter.isProfane(message)) {
            return callback('Profanity is not allowed!')
        }

        const user = getUser(socket.id)
        if(user){
            //Emit to everybody!
            io.to(user.room).emit('message', generateMessage(user.username, message))
            callback()
        }

    })

    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id)
        if(user) {
            io.to(user.room).emit('locationMessage', generateLocationMessage(user.username,`https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
            callback()
        }
    })

    //Disconnect
    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if(user){
            io.to(user.room).emit('message', generateMessage('admin', `${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room:user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})


server.listen(port, () => {
    console.log('Server is running on port: ', port)
})

