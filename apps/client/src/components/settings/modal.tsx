import { Modal, Stack } from "@mantine/core";
import { useForm } from "@mantine/form";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { useEffect, type FC } from "react";

import {
  SettingsFormSchema,
  type SettingsFormValues,
} from "../../schemas/settings-form";
import { platformService } from "../../services/platform";
import { useConnectionStore } from "../../stores/connection";
import { useSettingsStore } from "../../stores/settings";

import { SettingsForm } from "./form";

export type SettingsModalProps = {
  opened: boolean;
  onClose: () => void;
};

export const SettingsModal: FC<SettingsModalProps> = ({ opened, onClose }) => {
  const { status } = useConnectionStore();
  const connected = status === "connected";
  const settings = useSettingsStore();

  const form = useForm<SettingsFormValues>({
    initialValues: {
      serverUrl: settings.serverUrl,
      transportMode: settings.transportMode,
      pingInterval: settings.pingInterval,
      pollingInterval: settings.pollingInterval,
      launchOnStart: false,
      minimizeOnStart: settings.minimizeOnStart,
      minimizeOnClose: settings.minimizeOnClose,
      developerMode: settings.developerMode,
    },
    validate: zod4Resolver(SettingsFormSchema),
  });

  const handleResetServerURL = () => {
    form.setFieldValue("serverUrl", __DEFAULT_SERVER_URL__);
  };

  const handleSyncLaunchOnStart = () => {
    platformService.isAutoStartEnabled().then((enabled) => {
      form.setFieldValue("launchOnStart", enabled);
    });
  };

  useEffect(() => {
    if (opened) {
      handleSyncLaunchOnStart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  const handleSubmit = async (values: SettingsFormValues) => {
    settings.update({
      serverUrl: values.serverUrl,
      transportMode: values.transportMode,
      pingInterval: values.pingInterval,
      pollingInterval: values.pollingInterval,
      minimizeOnStart: values.minimizeOnStart,
      minimizeOnClose: values.minimizeOnClose,
      developerMode: values.developerMode,
    });

    if (values.launchOnStart) {
      await platformService.enableAutoStart();
    } else {
      await platformService.disableAutoStart();
    }

    onClose();
  };

  return (
    <Modal onClose={onClose} opened={opened} size={"md"} title={"Settings"}>
      <Stack gap={"md"}>
        <SettingsForm
          connected={connected}
          form={form}
          onClose={onClose}
          onResetServerURL={handleResetServerURL}
          onSubmit={handleSubmit}
        />
      </Stack>
    </Modal>
  );
};
