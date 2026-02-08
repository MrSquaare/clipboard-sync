import {
  TextInput,
  PasswordInput,
  Button,
  Stack,
  Checkbox,
  Group,
  ActionIcon,
} from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import { IconKey, IconLock, IconUser, IconX } from "@tabler/icons-react";
import type { FC } from "react";

import type { ConnectionFormValues } from "../../schemas/connection-form";

export type ConnectionFormProps = {
  form: UseFormReturnType<ConnectionFormValues>;
  onSubmit: (values: ConnectionFormValues) => void;
  onResetClientName: () => void;
  loading: boolean;
};

export const ConnectionForm: FC<ConnectionFormProps> = ({
  form,
  onSubmit,
  onResetClientName,
  loading,
}) => {
  const handleSaveSecretChange = (checked: boolean) => {
    form.setFieldValue("saveSecret", checked);

    if (!checked) {
      form.setFieldValue("autoConnectOnStart", false);
    }
  };

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <Stack gap={"md"}>
        <TextInput
          description={"How other clients will see you"}
          disabled={loading}
          label={"Client Name"}
          leftSection={<IconUser size={16} />}
          placeholder={"John's Laptop"}
          rightSection={
            <ActionIcon
              color={"gray"}
              disabled={loading}
              onClick={() => onResetClientName()}
              variant={"subtle"}
            >
              <IconX size={16} />
            </ActionIcon>
          }
          withAsterisk
          {...form.getInputProps("clientName")}
        />

        <TextInput
          description={"The ID of the room to connect to"}
          disabled={loading}
          label={"Room ID"}
          leftSection={<IconKey size={16} />}
          placeholder={"My Room 123"}
          withAsterisk
          {...form.getInputProps("roomId")}
        />

        <PasswordInput
          description={"The secret key for end-to-end encryption"}
          disabled={loading}
          label={"Secret Key"}
          leftSection={<IconLock size={16} />}
          placeholder={"••••••"}
          withAsterisk
          {...form.getInputProps("secret")}
        />

        <Group>
          <Checkbox
            checked={form.values.saveSecret}
            disabled={loading}
            label={"Save secret"}
            {...form.getInputProps("saveSecret", { type: "checkbox" })}
            onChange={(e) => handleSaveSecretChange(e.target.checked)}
          />
          <Checkbox
            checked={form.values.autoConnectOnStart}
            disabled={!form.values.saveSecret || loading}
            label={"Auto-connect on startup"}
            {...form.getInputProps("autoConnectOnStart", { type: "checkbox" })}
          />
        </Group>

        <Button
          fullWidth
          loading={loading}
          mt={"md"}
          type={"submit"}
          variant={"light"}
        >
          {loading ? "Connecting..." : "Connect"}
        </Button>
      </Stack>
    </form>
  );
};
