import {
  Button,
  Card,
  CopyButton,
  Group,
  ScrollArea,
  Table,
  Text,
} from "@mantine/core";
import { IconBug } from "@tabler/icons-react";
import type { FC } from "react";

import type { LogLevel } from "../../services/logger";
import { useLogsStore, type LogEntry } from "../../stores/logs";

const getLevelColor = (level: LogLevel) => {
  switch (level) {
    case "debug":
      return "dark.1";
    case "info":
      return "blue.4";
    case "warn":
      return "yellow.4";
    case "error":
      return "red.4";
  }
};

type RoomLogProps = {
  entry: LogEntry;
};

const RoomLogRow: FC<RoomLogProps> = ({ entry }) => {
  const time = new Date(entry.timestamp).toLocaleTimeString([], {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <Table.Tr key={entry.id}>
      <Table.Td w={100}>
        <Text c={"dark.2"} ff={"monospace"} size={"xs"}>
          {time}
        </Text>
      </Table.Td>
      <Table.Td>
        <Text
          c={getLevelColor(entry.level)}
          ff={"monospace"}
          size={"xs"}
          style={{
            wordBreak: "break-word",
            whiteSpace: "pre-wrap",
          }}
        >
          {entry.message}
        </Text>
      </Table.Td>
    </Table.Tr>
  );
};

export const RoomLogs: FC = () => {
  const { entries } = useLogsStore();

  return (
    <Card padding={"lg"} radius={"md"} shadow={"sm"} withBorder>
      <Card.Section inheritPadding py={"xs"} withBorder>
        <Group justify={"space-between"}>
          <Group gap={"xs"}>
            <IconBug size={20} />
            <Text fw={500}>Debug Log</Text>
          </Group>
          <CopyButton value={JSON.stringify(entries, null, 2)}>
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
              {entries.map((entry) => (
                <RoomLogRow entry={entry} key={entry.id} />
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card.Section>
    </Card>
  );
};
