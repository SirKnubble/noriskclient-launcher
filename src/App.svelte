<script>
  import Router from "./Router.svelte";
  import { onMount } from "svelte";
  import { defaultUser, fetchDefaultUserOrError } from "./stores/credentialsStore.js";
  import { fetchOptions } from "./stores/optionsStore.js";
  import { fetchBranches } from "./stores/branchesStore.js";
  import { fetchProfiles } from "./stores/profilesStore.js";
  import { listen } from "@tauri-apps/api/event";
  import { location, push } from "svelte-spa-router";
  import {
    isClientRunning,
    startProgress,
    getNoRiskUser,
    getMaintenanceMode,
    noriskError,
    noriskLog,
    checkIfClientIsRunning,
  } from "./utils/noriskUtils.js";
  import { appWindow } from "@tauri-apps/api/window";
  import { invoke } from "@tauri-apps/api";
  import { addNotification } from "./stores/notificationStore.js";

  onMount(async () => {
    setTimeout(async () => {
      await appWindow.show();
    }, 300);
    await checkIfClientIsRunning()
    await fetchOptions();
    await fetchDefaultUserOrError(false);
    await getNoRiskUser();
    await fetchBranches();
    await fetchProfiles();
    await getMaintenanceMode();

    let unlisten = await listen("client-exited", () => {
      isClientRunning.set(false);
      startProgress.set({
        progressBarMax: 0,
        progressBarProgress: 0,
        progressBarLabel: "",
      });
      push("/");
    });

    const minecraftCrashUnlisten = await listen("minecraft-crash", async (event) => {
      const crashReportPath = event.payload; // Extract the path from the event's payload
      noriskError("Crash Report Path: " + crashReportPath);
      await invoke("open_minecraft_crash_window", { crashReportPath: crashReportPath })
        .catch(reason => {
          addNotification(reason);
          noriskError(reason);
        });
    });

    const userUnlisten = defaultUser.subscribe(async value => {
      noriskLog("Default User Was Updated.");
      await fetchBranches();
      await fetchProfiles();
    });

    return () => {
      unlisten();
      minecraftCrashUnlisten();
      userUnlisten();
    };
  });
</script>

<main>
  <Router />
</main>

<style>
</style>
