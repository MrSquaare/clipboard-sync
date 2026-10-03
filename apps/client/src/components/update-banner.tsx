import {
  Button,
  Dialog,
  Group,
  Progress,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { IconCheck, IconDownload, IconRotate } from "@tabler/icons-react";
import type { FC } from "react";

import { updaterService } from "../services/updater";
import { useUpdaterStore } from "../stores/updater";

export const UpdateBanner: FC = () => {
  const { status, update, downloadProgress, dismissed } = useUpdaterStore();

  const isVisible =
    !dismissed &&
    (status === "available" || status === "downloading" || status === "ready");

  return (
    <Dialog
      opened={isVisible}
      onClose={() => updaterService.dismiss()}
      position={{ bottom: 16, right: 16 }}
      radius={"md"}
      shadow={"lg"}
      size={"md"}
      transitionProps={{ transition: "slide-up", duration: 200 }}
      withBorder
      withCloseButton={status !== "downloading"}
    >
      {status === "available" && update && (
        <Stack gap={"xs"}>
          <Group gap={"xs"} wrap={"nowrap"}>
            <ThemeIcon
              color={"blue"}
              radius={"xl"}
              size={"sm"}
              variant={"light"}
            >
              <IconDownload size={14} />
            </ThemeIcon>
            <Text fw={600} size={"sm"}>
              Update available (v{update.version})
            </Text>
          </Group>

          {update.body && (
            <Text c={"dimmed"} lineClamp={2} size={"xs"}>
              {update.body}
            </Text>
          )}

          <Group justify={"flex-end"} mt={4}>
            <Button
              onClick={() => updaterService.downloadAndInstall()}
              size={"xs"}
              variant={"light"}
            >
              Download & Install
            </Button>
          </Group>
        </Stack>
      )}

      {status === "downloading" && (
        <Stack gap={"xs"}>
          <Group gap={"xs"} wrap={"nowrap"}>
            <ThemeIcon
              color={"blue"}
              radius={"xl"}
              size={"sm"}
              variant={"light"}
            >
              <IconDownload size={14} />
            </ThemeIcon>
            <Text fw={600} size={"sm"}>
              Downloading update v{update?.version}...
            </Text>
          </Group>

          <Progress
            animated
            color={"blue"}
            size={"xs"}
            striped
            value={downloadProgress > 0 ? downloadProgress : 100}
          />

          {downloadProgress > 0 && (
            <Text c={"dimmed"} size={"xs"} ta={"right"}>
              {downloadProgress}%
            </Text>
          )}
        </Stack>
      )}

      {status === "ready" && (
        <Stack gap={"xs"}>
          <Group gap={"xs"} wrap={"nowrap"}>
            <ThemeIcon
              color={"teal"}
              radius={"xl"}
              size={"sm"}
              variant={"light"}
            >
              <IconCheck size={14} />
            </ThemeIcon>
            <Text fw={600} size={"sm"}>
              Update ready
            </Text>
          </Group>

          <Text c={"dimmed"} size={"xs"}>
            Restart the application to apply the update.
          </Text>

          <Group justify={"flex-end"} mt={4}>
            <Button
              color={"teal"}
              leftSection={<IconRotate size={14} />}
              onClick={() => updaterService.restart()}
              size={"xs"}
              variant={"light"}
            >
              Restart
            </Button>
          </Group>
        </Stack>
      )}
    </Dialog>
  );
};
