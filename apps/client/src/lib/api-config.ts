export const API_BASE =
  import.meta.env.MODE === "development"
    ? "http://localhost:3001/api"
    : "http://8.152.201.45:3001/api";

export const SOCKET_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:3001"
    : "http://8.152.201.45:3001";

export const AUTH_BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:3001"
    : "http://8.152.201.45:3001";
