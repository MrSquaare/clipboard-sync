import {
  TextInput,
  PasswordInput,
  Button,
  Select,
  NumberInput,
  Switch,
  Paper,
  Stack,
  Collapse,
  Alert,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import {
  IconServer,
  IconKey,
  IconLock,
  IconNetwork,
  IconAlertCircle,
  IconChevronDown,
  IconChevronRight,
} from "@tabler/icons-react";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { z } from "zod";

const formSchema = z.object({
  serverUrl: z.url({
    protocol: /^(ws|wss)$/,
    message: "Server URL must be a valid URL starting with ws:// or wss://",
  }),
  roomId: z.string().min(1, "Room ID is required"),
  secret: z.string().min(1, "Secret Key is required"),
  transportMode: z.enum(
    ["auto", "p2p", "relay"],
    "Transport mode must be one of auto, p2p, or relay",
  ),
  pollingInterval: z
    .number("Polling interval must be a number")
    .min(100, "Polling interval must be at least 100ms"),
  pingInterval: z
    .number("Ping interval must be a number")
    .min(5000, "Ping interval must be at least 5000ms"),
  developerMode: z.boolean(),
});

export type FormValues = z.infer<typeof formSchema>;

export type FormProps = {
  initialValues?: FormValues;
  onSubmit: (values: FormValues) => Promise<void>;
  loading: boolean;
  error: string | null;
};

export function Form({ initialValues, onSubmit, loading, error }: FormProps) {
  const [showAdvanced, { toggle: toggleAdvanced }] = useDisclosure(false);

  const form = useForm<FormValues>({
    initialValues: initialValues,
    validate: zod4Resolver(formSchema),
  });

  const handleUseDefaultUrl = () => {
    form.setFieldValue("serverUrl", __DEFAULT_SERVER_URL__);
  };

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <Stack gap={"md"}>
        <TextInput
          label={"Server URL"}
          leftSection={<IconServer size={16} />}
          placeholder={"wss://..."}
          rightSection={
            <Button
              onClick={handleUseDefaultUrl}
              size={"compact-xs"}
              variant={"light"}
            >
              Reset
            </Button>
          }
          rightSectionWidth={64}
          withAsterisk
          {...form.getInputProps("serverUrl")}
        />

        <TextInput
          label={"Room ID"}
          leftSection={<IconKey size={16} />}
          placeholder={"my-room"}
          withAsterisk
          {...form.getInputProps("roomId")}
        />

        <PasswordInput
          label={"Secret Key"}
          leftSection={<IconLock size={16} />}
          placeholder={"Shared secret"}
          withAsterisk
          {...form.getInputProps("secret")}
        />

        <Select
          data={[
            { value: "auto", label: "Auto" },
            { value: "p2p", label: "P2P Only" },
            { value: "relay", label: "Relay Only" },
          ]}
          label={"Transport Mode"}
          leftSection={<IconNetwork size={16} />}
          {...form.getInputProps("transportMode")}
        />

        <Button
          leftSection={
            showAdvanced ? (
              <IconChevronDown size={16} />
            ) : (
              <IconChevronRight size={16} />
            )
          }
          onClick={toggleAdvanced}
          size={"sm"}
          variant={"subtle"}
        >
          Advanced Settings
        </Button>

        <Collapse in={showAdvanced}>
          <Paper bg={"transparent"} mt={"sm"} p={"xs"} withBorder>
            <Stack gap={"sm"}>
              <NumberInput
                label={"Polling Interval (ms)"}
                min={100}
                {...form.getInputProps("pollingInterval")}
              />
              <NumberInput
                label={"Ping Interval (ms)"}
                min={5000}
                {...form.getInputProps("pingInterval")}
              />
              <Switch
                label={"Developer Mode"}
                {...form.getInputProps("developerMode", {
                  type: "checkbox",
                })}
              />
            </Stack>
          </Paper>
        </Collapse>

        {error && (
          <Alert
            color={"red"}
            icon={<IconAlertCircle size={16} />}
            title={"Error"}
            variant={"light"}
          >
            {error}
          </Alert>
        )}

        <Button fullWidth loading={loading} mt={"md"} type={"submit"}>
          Join Room
        </Button>
      </Stack>
    </form>
  );
}
