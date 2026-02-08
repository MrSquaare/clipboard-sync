import {
  ActionIcon,
  Alert,
  Center,
  Group,
  Paper,
  Stack,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconAlertCircle, IconSettings } from "@tabler/icons-react";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { type FC } from "react";

import {
  ConnectionForm,
  ConnectionFormSchema,
  type ConnectionFormValues,
} from "../components/connection/form";
import { SettingsModal } from "../components/settings/modal";
import { useAutoConnect } from "../hooks/use-auto-connection";
import { useConnection } from "../hooks/use-connection";
import { useOneTimeEffect } from "../hooks/use-one-time-effect";
import { platformService } from "../services/platform";
import { secretService } from "../services/secret";
import { useConnectionStore } from "../stores/connection";
import { useSettingsStore } from "../stores/settings";

export const ConnectionScreen: FC = () => {
  const connection = useConnectionStore();
  const settings = useSettingsStore();
  const [settingsOpened, { open: openSettings, close: closeSettings }] =
    useDisclosure(false);
  const { connect } = useConnection();

  const form = useForm<ConnectionFormValues>({
    initialValues: {
      clientName: settings.clientName,
      roomId: settings.roomId,
      secret: "",
      saveSecret: settings.saveSecret,
      autoConnectOnStart: settings.autoConnectOnStart,
    },
    validate: zod4Resolver(ConnectionFormSchema),
  });

  const handleResetClientName = () => {
    platformService.getDeviceName().then((name) => {
      form.setFieldValue("clientName", name);
    });
  };

  const syncSecret = () => {
    secretService.loadSecret().then((secret) => {
      form.setFieldValue("secret", secret ?? "");
    });
  };

  useOneTimeEffect(() => {
    if (!settings.clientName) {
      handleResetClientName();
    }

    if (settings.saveSecret) {
      syncSecret();
    }
  });

  useAutoConnect();

  const handleSubmit = async (values: ConnectionFormValues) => {
    connection.setStatus("connecting");

    settings.update({
      clientName: values.clientName,
      roomId: values.roomId,
      saveSecret: values.saveSecret,
      autoConnectOnStart: values.autoConnectOnStart,
    });

    await connect({
      secret: values.secret,
      saveSecret: values.saveSecret,
    });
  };

  const loading = connection.status === "connecting";
  const error = connection.error;

  return (
    <>
      <SettingsModal onClose={closeSettings} opened={settingsOpened} />
      <Center h={"100vh"} p={"md"}>
        <Paper
          maw={500}
          p={"md"}
          radius={"md"}
          shadow={"sm"}
          w={"100%"}
          withBorder
        >
          <Stack gap={"lg"} w={"100%"}>
            <Group justify={"space-between"}>
              <Title order={2}>Connection to Room</Title>
              <ActionIcon onClick={openSettings} variant={"subtle"}>
                <IconSettings size={20} />
              </ActionIcon>
            </Group>
            {error && (
              <Alert
                color={"red"}
                icon={<IconAlertCircle size={16} />}
                title={"Connection error"}
                variant={"light"}
              >
                {error}
              </Alert>
            )}
            <ConnectionForm
              form={form}
              loading={loading}
              onResetClientName={handleResetClientName}
              onSubmit={handleSubmit}
            />
          </Stack>
        </Paper>
      </Center>
    </>
  );
};
