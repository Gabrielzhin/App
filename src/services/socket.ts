import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOCKET_URL = 'http://10.0.2.2:4000'; // Android emulator

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  async connect() {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return this.socket;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('No token found, cannot connect socket');
        return null;
      }

      this.socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts,
      });

      this.socket.on('connect', () => {
        console.log('✅ Socket connected:', this.socket?.id);
        this.reconnectAttempts = 0;
      });

      this.socket.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.log('Max reconnection attempts reached');
          this.disconnect();
        }
      });

      return this.socket;
    } catch (error) {
      console.error('Error connecting socket:', error);
      return null;
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('Socket disconnected manually');
    }
  }

  getSocket() {
    return this.socket;
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  // Group chat methods
  joinGroup(groupId: string) {
    if (this.socket?.connected) {
      this.socket.emit('join_group', groupId);
      console.log(`Joined group: ${groupId}`);
    }
  }

  leaveGroup(groupId: string) {
    if (this.socket?.connected) {
      this.socket.emit('leave_group', groupId);
      console.log(`Left group: ${groupId}`);
    }
  }

  onNewGroupMessage(callback: (message: any) => void) {
    if (this.socket) {
      this.socket.on('new_group_message', callback);
    }
  }

  offNewGroupMessage() {
    if (this.socket) {
      this.socket.off('new_group_message');
    }
  }

  emitTypingGroup(groupId: string, isTyping: boolean) {
    if (this.socket?.connected) {
      this.socket.emit('typing_group', { groupId, isTyping });
    }
  }

  onUserTypingGroup(callback: (data: { userId: string; username: string; groupId: string; isTyping: boolean }) => void) {
    if (this.socket) {
      this.socket.on('user_typing_group', callback);
    }
  }

  offUserTypingGroup() {
    if (this.socket) {
      this.socket.off('user_typing_group');
    }
  }

  // Direct message methods
  joinDM(otherUserId: string) {
    if (this.socket?.connected) {
      this.socket.emit('join_dm', otherUserId);
      console.log(`Joined DM with: ${otherUserId}`);
    }
  }

  leaveDM(otherUserId: string) {
    if (this.socket?.connected) {
      this.socket.emit('leave_dm', otherUserId);
      console.log(`Left DM with: ${otherUserId}`);
    }
  }

  onNewDM(callback: (message: any) => void) {
    if (this.socket) {
      this.socket.on('new_dm', callback);
    }
  }

  offNewDM() {
    if (this.socket) {
      this.socket.off('new_dm');
    }
  }

  emitTypingDM(otherUserId: string, isTyping: boolean) {
    if (this.socket?.connected) {
      this.socket.emit('typing_dm', { otherUserId, isTyping });
    }
  }

  onUserTypingDM(callback: (data: { userId: string; username: string; isTyping: boolean }) => void) {
    if (this.socket) {
      this.socket.on('user_typing_dm', callback);
    }
  }

  offUserTypingDM() {
    if (this.socket) {
      this.socket.off('user_typing_dm');
    }
  }
}

export const socketService = new SocketService();
