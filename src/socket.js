// src/socket.js
import { io } from 'socket.io-client';

// Usamos la IP base limpia desde el .env
const URL_BACKEND_SOCKET = "https://backend-node-inubator.onrender.com";

export const socket = io("https://backend-node-inubator.onrender.com", {
    autoConnect: true,
});