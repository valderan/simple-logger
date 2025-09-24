package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
    "os"
)

type invalidLogPayload struct {
    UUID string `json:"uuid"`
    Log  struct {
        Level string   `json:"level"`
        Tags  []string `json:"tags"`
    } `json:"log"`
}

func main() {
    apiURL := getEnv("API_URL", "http://localhost:3000")
    uuid := getEnv("PROJECT_UUID", "00000000-0000-0000-0000-000000000000")

    payload := invalidLogPayload{UUID: uuid}
    payload.Log.Level = "INFO"
    payload.Log.Tags = []string{"TEST"}

    body, _ := json.Marshal(payload)

    resp, err := http.Post(fmt.Sprintf("%s/api/logs", apiURL), "application/json", bytes.NewReader(body))
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    if resp.StatusCode == http.StatusBadRequest {
        fmt.Println("Ошибка формата лога: 400 Bad Request")
        return
    }

    fmt.Printf("Получен статус: %s\n", resp.Status)
}

func getEnv(key, fallback string) string {
    if value, ok := os.LookupEnv(key); ok {
        return value
    }
    return fallback
}
