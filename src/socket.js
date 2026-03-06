// src/socket.js
import { io } from 'socket.io-client';

// Usamos la IP base limpia desde el .env
const URL_BACKEND_SOCKET = "https://api-taller.onrender.com";

export const socket = io("https://api-taller.onrender.com", {
    autoConnect: true,
});
