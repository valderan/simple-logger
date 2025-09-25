import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { useTranslation } from '../hooks/useTranslation';

const pythonIngestLogExample = String.raw`"""Send a structured log message to the collector."""

import requests

BASE_URL = "http://localhost:3000/api"
PROJECT_UUID = "<project-uuid>"


def ingest_log() -> None:
    payload = {
        "uuid": PROJECT_UUID,
        "log": {
            "level": "ERROR",
            "message": "Payment gateway returned non-200 response",
            "tags": ["PAYMENT"],
            "metadata": {
                "service": "billing-service",
                "user": "user-42",
                "ip": "10.0.0.12",
                "extra": {"orderId": "A-42"},
            },
        },
    }
    response = requests.post(f"{BASE_URL}/logs", json=payload, timeout=10)
    response.raise_for_status()
    print("Stored log ID:", response.json()["_id"])


if __name__ == "__main__":
    ingest_log()`;

const typescriptIngestLogExample = String.raw`import { LoggerApiClient } from './loggerClient';

/**
 * Sends an application log entry to the collector.  This endpoint does not require
 * administrator authentication because it is intended for services emitting logs.
 */
async function main(): Promise<void> {
  const client = new LoggerApiClient({ baseUrl: 'http://localhost:3000/api' });

  try {
    const log = await client.ingestLog({
      uuid: '<project-uuid>',
      log: {
        level: 'ERROR',
        message: 'Payment gateway returned non-200 response',
        tags: ['PAYMENT'],
        metadata: {
          service: 'billing-service',
          user: 'user-42',
          ip: '10.0.0.12',
          extra: { orderId: 'A-42' }
        }
      }
    });

    console.log('Stored log with id:', log._id);
  } catch (error) {
    console.error('Failed to send log:', error);
  }
}

void main();`;

const goIngestLogExample = String.raw`// Command ingest_log demonstrates how services can push logs to the collector.
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
)

const projectUUIDForLogs = "<project-uuid>"

func main() {
    payload := map[string]any{
        "uuid": projectUUIDForLogs,
        "log": map[string]any{
            "level":   "ERROR",
            "message": "Payment gateway returned non-200 response",
            "tags":    []string{"PAYMENT"},
            "metadata": map[string]any{
                "service": "billing-service",
                "user":    "user-42",
                "ip":      "10.0.0.12",
                "extra":   map[string]any{"orderId": "A-42"},
            },
        },
    }

    body, _ := json.Marshal(payload)
    resp, err := http.Post(baseURL+"/logs", "application/json", bytes.NewReader(body))
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusCreated {
        data, _ := io.ReadAll(resp.Body)
        panic(fmt.Sprintf("unexpected status %d: %s", resp.StatusCode, data))
    }

    var logEntry struct {
        ID string \`json:"_id"\`
    }
    if err := json.NewDecoder(resp.Body).Decode(&logEntry); err != nil {
        panic(err)
    }

    fmt.Println("Stored log ID:", logEntry.ID)
}`;

const bashIngestLogExample = String.raw`#!/usr/bin/env bash
# Send an application log entry to the collector.

set -euo pipefail

BASE_URL="http://localhost:3000/api"
PROJECT_UUID="<project-uuid>"

curl -sS -X POST "\${BASE_URL}/logs" \
  -H 'Content-Type: application/json' \
  -d '{
        "uuid": "'"\${PROJECT_UUID}"'",
        "log": {
          "level": "ERROR",
          "message": "Payment gateway returned non-200 response",
          "tags": ["PAYMENT"],
          "metadata": {
            "service": "billing-service",
            "user": "user-42",
            "ip": "10.0.0.12",
            "extra": {"orderId": "A-42"}
          }
        }
      }' | jq`;

const helpSectionKeys = ['dashboard', 'projects', 'addProject', 'logs', 'ping', 'telegram', 'settings', 'rateLimit', 'faq'] as const;
const addProjectKeys = [
  'name',
  'description',
  'logFormat',
  'defaultTags',
  'customTags',
  'accessLevel',
  'telegramNotify',
  'antiSpam',
  'recipients',
  'debugMode'
] as const;

const apiExamples = [
  { titleKey: 'faq.apiExamples.ingestLogPython', code: pythonIngestLogExample },
  { titleKey: 'faq.apiExamples.ingestLogTypeScript', code: typescriptIngestLogExample },
  { titleKey: 'faq.apiExamples.ingestLogGo', code: goIngestLogExample },
  { titleKey: 'faq.apiExamples.ingestLogBash', code: bashIngestLogExample },
] as const;

export const FAQPage = (): JSX.Element => {
  const { t } = useTranslation();

  return (
    <Stack spacing={4}>
      <Stack spacing={1}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {t('faq.title')}
        </Typography>
        <Typography color="text.secondary">{t('faq.intro')}</Typography>
      </Stack>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {t('faq.helpSection.title')}
            </Typography>
            <Stack spacing={1.5}>
              {helpSectionKeys.map((key) => (
                <Typography key={key} variant="body1">
                  {t(`faq.helpSection.${key}`)}
                </Typography>
              ))}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {t('faq.addProjectDetails.title')}
            </Typography>
            <Stack spacing={1.5}>
              {addProjectKeys.map((key) => (
                <Typography key={key} variant="body1">
                  {t(`faq.addProjectDetails.${key}`)}
                </Typography>
              ))}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {t('faq.apiExamples.title')}
            </Typography>
            <Typography color="text.secondary">{t('faq.apiExamples.description')}</Typography>
            <Stack spacing={3}>
              {apiExamples.map((example) => (
                <Box key={example.titleKey}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {t(example.titleKey)}
                  </Typography>
                  <Box
                    component="pre"
                    sx={{
                      bgcolor: 'grey.900',
                      color: 'grey.100',
                      p: 2,
                      borderRadius: 2,
                      overflow: 'auto'
                    }}
                  >
                    <code>{example.code}</code>
                  </Box>
                </Box>
              ))}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

    </Stack>
  );
};
