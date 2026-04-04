package ws

import (
	"log/slog"
	"sync"
	"time"

	"github.com/gofiber/contrib/websocket"
)

const (
	pingInterval = 30 * time.Second
	pongDeadline = 60 * time.Second
	sendBufSize  = 256
)

type BroadcastMsg struct {
	LocomotiveID int
	Payload      []byte
}

type Client struct {
	locomotiveID int // 0 = subscribe to all
	conn         *websocket.Conn
	send         chan []byte
	hub          *Hub
}

type Hub struct {
	rooms      map[int]map[*Client]struct{}
	mu         sync.RWMutex
	broadcast  chan BroadcastMsg
	register   chan *Client
	unregister chan *Client
}

func NewHub() *Hub {
	return &Hub{
		rooms:      make(map[int]map[*Client]struct{}),
		broadcast:  make(chan BroadcastMsg, 256),
		register:   make(chan *Client, 64),
		unregister: make(chan *Client, 64),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			if h.rooms[client.locomotiveID] == nil {
				h.rooms[client.locomotiveID] = make(map[*Client]struct{})
			}
			h.rooms[client.locomotiveID][client] = struct{}{}
			h.mu.Unlock()

		case client := <-h.unregister:
			h.mu.Lock()
			if room, ok := h.rooms[client.locomotiveID]; ok {
				delete(room, client)
				if len(room) == 0 {
					delete(h.rooms, client.locomotiveID)
				}
			}
			h.mu.Unlock()
			close(client.send)

		case msg := <-h.broadcast:
			h.mu.RLock()
			// Send to room subscribers
			targets := make([]*Client, 0)
			if room, ok := h.rooms[msg.LocomotiveID]; ok {
				for c := range room {
					targets = append(targets, c)
				}
			}
			// Send to "all" subscribers (locomotiveID == 0)
			if msg.LocomotiveID != 0 {
				if room, ok := h.rooms[0]; ok {
					for c := range room {
						targets = append(targets, c)
					}
				}
			}
			h.mu.RUnlock()

			for _, c := range targets {
				select {
				case c.send <- msg.Payload:
				default:
					// Buffer full — slow client, drop and disconnect
					go h.dropClient(c)
				}
			}
		}
	}
}

func (h *Hub) dropClient(c *Client) {
	h.unregister <- c
	c.conn.Close()
}

func (h *Hub) Broadcast(msg BroadcastMsg) {
	select {
	case h.broadcast <- msg:
	default:
		slog.Warn("ws.Hub broadcast channel full, dropping message", "locomotive_id", msg.LocomotiveID)
	}
}

// ServeWS handles an incoming WebSocket connection.
func (h *Hub) ServeWS(conn *websocket.Conn, locomotiveID int) {
	client := &Client{
		locomotiveID: locomotiveID,
		conn:         conn,
		send:         make(chan []byte, sendBufSize),
		hub:          h,
	}
	h.register <- client

	// Writer goroutine
	go func() {
		pingTicker := time.NewTicker(pingInterval)
		defer func() {
			pingTicker.Stop()
			h.unregister <- client
			conn.Close()
		}()

		for {
			select {
			case msg, ok := <-client.send:
				conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
				if !ok {
					conn.WriteMessage(websocket.CloseMessage, []byte{})
					return
				}
				if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
					slog.Error("ws write error", "err", err)
					return
				}
			case <-pingTicker.C:
				conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
				if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
					return
				}
			}
		}
	}()

	// Reader goroutine (keep alive + pong handling)
	conn.SetReadDeadline(time.Now().Add(pongDeadline))
	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(pongDeadline))
		return nil
	})

	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			break
		}
	}
}
