import WebSocket from "ws";

const ClientsMap = new Map<string, Set<WebSocket>>();

export default ClientsMap