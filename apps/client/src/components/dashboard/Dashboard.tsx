import { Container, SimpleGrid } from "@mantine/core";

import { useSettingsStore } from "../../store/useSettingsStore";

import { ClientsCard } from "./ClientsCard";
import { DebugLogCard } from "./DebugLogCard";
import { InformationHeader } from "./InformationHeader";

export function Dashboard() {
  const { developerMode } = useSettingsStore();

  return (
    <Container py={"md"} size={"lg"}>
      <InformationHeader />
      <SimpleGrid cols={{ base: 1, md: developerMode ? 2 : 1 }} spacing={"lg"}>
        <ClientsCard />
        {developerMode && <DebugLogCard />}
      </SimpleGrid>
    </Container>
  );
}
