import {
  Card,
  Group,
  Text,
  ScrollArea,
  Table,
  CopyButton,
  Button,
} from "@mantine/core";
import { IconBug } from "@tabler/icons-react";

import { useLogStore } from "../../store/useLogStore";

export function DebugLogCard() {
  const { logs } = useLogStore();

  return (
    <Card padding={"lg"} radius={"md"} shadow={"sm"} withBorder>
      <Card.Section inheritPadding py={"xs"} withBorder>
        <Group justify={"space-between"}>
          <Group gap={"xs"}>
            <IconBug size={20} />
            <Text fw={500}>Debug Log</Text>
          </Group>
          <CopyButton value={JSON.stringify(logs, null, 2)}>
            {({ copied, copy }) => (
              <Button
                color={"gray"}
                onClick={copy}
                size={"compact-sm"}
                variant={"light"}
              >
                {copied ? "Copied" : "Copy"}
              </Button>
            )}
          </CopyButton>
        </Group>
      </Card.Section>

      <Card.Section bg={"dark.8"}>
        <ScrollArea h={400} type={"auto"}>
          <Table
            highlightOnHover
            highlightOnHoverColor={"dark.6"}
            style={{ tableLayout: "fixed" }}
            verticalSpacing={"xs"}
            withColumnBorders
          >
            <Table.Tbody>
              {logs.map((log) => (
                <Table.Tr key={log.id}>
                  <Table.Td w={100}>
                    <Text c={"dark.2"} ff={"monospace"} size={"xs"}>
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour12: false,
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text
                      c={
                        log.type === "error"
                          ? "red.4"
                          : log.type === "success"
                            ? "green.4"
                            : "dark.1"
                      }
                      ff={"monospace"}
                      size={"xs"}
                      style={{
                        wordBreak: "break-word",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {log.message}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card.Section>
    </Card>
  );
}
