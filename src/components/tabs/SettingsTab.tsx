"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { ActionButton } from "../ui/ActionButton";
import { Modal } from "../ui/Modal";
import { SearchWithFilters } from "../ui/SearchWithFilters";
import { SettingsSearchContext } from "../ui/settings/SettingsSearchContext";
import { GroupTabs, type GroupTab } from "../ui/GroupTabs";
import type { LauncherConfig } from "../../types/launcherConfig";
import * as ConfigService from "../../services/launcher-config-service";
import { useThemeStore } from "../../store/useThemeStore";
import { DebugSection, getDebugTabs } from "./DebugSection";
import { GeneralTab } from "./settings/GeneralTab";
import { AppearanceTab } from "./settings/AppearanceTab";
import { AdvancedTab } from "./settings/AdvancedTab";
import { SettingsConfigProvider } from "./settings/settings-context";
import { openLauncherDirectory } from "../../services/tauri-service";
import { setDiscordState } from "../../utils/discordRpc";
import { parseErrorMessage } from "../../utils/error-utils";

type SettingsTabId = "general" | "appearance" | "advanced" | "debug";

interface SettingsTabProps {
  onClose: () => void;
}

export function SettingsTab({ onClose }: SettingsTabProps) {
  const { t } = useTranslation();
  const { accentColor, resetFirstInstallSetupWizard } = useThemeStore();
  const [config, setConfig] = useState<LauncherConfig | null>(null);
  const [tempConfig, setTempConfig] = useState<LauncherConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTabId>("general");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressSpyRef = useRef(false);
  const sidebarQuery = debouncedSearch.trim().toLowerCase();

  const sectionDefs: Record<SettingsTabId, { id: string; label: string }[]> = {
    general: [
      { id: "language", label: t("settings.language") },
      { id: "accent", label: t("settings.accent_color.title") },
      { id: "behaviour", label: t("settings.sections.behaviour") },
      { id: "interface", label: t("settings.sections.interface") },
    ],
    appearance: [
      { id: "theme", label: t("settings.theme.title") },
      { id: "font", label: t("settings.font.title") },
      { id: "background", label: t("settings.background.title") },
      { id: "custom-background", label: t("settings.custom_background.title") },
    ],
    advanced: [
      { id: "login_cache", label: t("settings.sections.login_cache") },
      { id: "gamedir", label: t("settings.game_data_dir.title") },
      { id: "hooks", label: t("settings.hooks.title") },
      { id: "licenses", label: t("settings.licenses.title") },
    ],
    debug: getDebugTabs(t),
  };
  const groups: GroupTab[] = [
    {
      id: "general",
      name: t("settings.tabs.general"),
      count: sectionDefs.general.length,
      icon: "solar:settings-bold",
    },
    {
      id: "appearance",
      name: t("settings.tabs.appearance"),
      count: sectionDefs.appearance.length,
      icon: "solar:palette-bold",
    },
    {
      id: "advanced",
      name: t("settings.tabs.advanced"),
      count: sectionDefs.advanced.length,
      icon: "solar:tuning-bold",
    },
    {
      id: "debug",
      name: t("settings.tabs.debug"),
      count: sectionDefs.debug.length,
      icon: "solar:bug-bold",
    },
  ];

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(sidebarSearch), 150);
    return () => clearTimeout(timeout);
  }, [sidebarSearch]);

  useEffect(() => {
    setDiscordState("Configuring Settings");
  }, []);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loadedConfig = await ConfigService.getLauncherConfig();
      const configWithHooks = {
        ...loadedConfig,
        hooks: loadedConfig.hooks ?? {
          pre_launch: null,
          wrapper: null,
          post_exit: null,
        },
      };
      setConfig(configWithHooks);
      setTempConfig({ ...configWithHooks });
    } catch (err) {
      setError(parseErrorMessage(err));
      setConfig(null);
      setTempConfig(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (
      !tempConfig ||
      !config ||
      JSON.stringify(tempConfig) === JSON.stringify(config)
    )
      return;
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        setConfig(await ConfigService.setLauncherConfig(tempConfig));
        toast.success(t("settings.toast.auto_saved"), {
          duration: 2000,
          position: "bottom-right",
        });
      } catch (err) {
        toast.error(
          t("settings.toast.auto_save_failed", {
            error: parseErrorMessage(err),
          }),
        );
      } finally {
        setSaving(false);
      }
    }, 500);
    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
  }, [config, tempConfig, t]);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [activeTab, sidebarQuery]);

  useEffect(() => {
    if (sidebarQuery) return;
    const root = contentRef.current;
    const sections = sectionDefs[activeTab];
    if (!root || sections.length === 0) return;
    const onScroll = () => {
      if (suppressSpyRef.current) return;
      const rootTop = root.getBoundingClientRect().top;
      let current = sections[0].id;
      for (const section of sections) {
        const element = document.getElementById(
          `settings-section-${section.id}`,
        );
        if (element && element.getBoundingClientRect().top - rootTop <= 80)
          current = section.id;
      }
      setActiveSection(current);
    };
    onScroll();
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => root.removeEventListener("scroll", onScroll);
  }, [activeTab, sidebarQuery, config, tempConfig]);

  const selectTab = (id: SettingsTabId) => {
    setSidebarSearch("");
    setActiveTab(id);
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(`settings-section-${id}`);
    if (!element) return;
    suppressSpyRef.current = true;
    setActiveSection(id);
    element.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => {
      suppressSpyRef.current = false;
    }, 500);
  };

  const bodyOf: Partial<Record<SettingsTabId, ReactNode>> = {
    general: <GeneralTab />,
    appearance: <AppearanceTab />,
    advanced: <AdvancedTab />,
  };

  const renderContent = () => {
    if (loading)
      return (
        <div className="flex h-64 items-center justify-center">
          <Icon
            icon="svg-spinners:ring-resize"
            className="h-10 w-10 text-white/70"
          />
        </div>
      );
    if (error)
      return (
        <div className="m-4 rounded-lg border-2 border-red-700/50 bg-red-900/30 p-6">
          <p className="text-red-200/80">{error}</p>
          <ActionButton
            id="retry-settings"
            label={t("common.try_again")}
            icon="solar:refresh-bold"
            onClick={() => void loadConfig()}
          />
        </div>
      );
    if (!config || !tempConfig)
      return (
        <p className="p-8 text-center text-white/70">
          {t("settings.error.no_config")}
        </p>
      );
    if (sidebarQuery) {
      const order: SettingsTabId[] = ["general", "appearance", "advanced"];
      const tabs = [
        activeTab,
        ...order.filter((id) => id !== activeTab),
      ].filter((id) => bodyOf[id]);
      return (
        <div className="space-y-6">
          {tabs.map((id) => (
            <Fragment key={id}>{bodyOf[id]}</Fragment>
          ))}
        </div>
      );
    }
    return activeTab === "debug" ? (
      <DebugSection />
    ) : (
      (bodyOf[activeTab] ?? null)
    );
  };

  return (
    <Modal
      title={t("nav.settings")}
      titleIcon={<Icon icon="solar:settings-bold" className="h-8 w-8" />}
      onClose={onClose}
      width="xl"
      className="!max-w-6xl h-[85vh] min-h-[600px] flex flex-col"
      headerActions={
        <ActionButton
          id="reopen-wizard"
          icon="solar:magic-stick-bold"
          variant="icon-only"
          tooltip="Run First Install Setup Wizard again"
          size="sm"
          onClick={resetFirstInstallSetupWizard}
        />
      }
    >
      <div className="flex h-full gap-2 p-4">
        <aside className="flex w-64 flex-shrink-0 flex-col">
          <SearchWithFilters
            placeholder={t("common.search")}
            searchValue={sidebarSearch}
            onSearchChange={setSidebarSearch}
            showSort={false}
            showFilter={false}
            compact
            className="mb-3 w-full"
          />
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <GroupTabs
              groups={groups}
              activeGroup={activeTab}
              onGroupChange={(id) => selectTab(id as SettingsTabId)}
              showAddButton={false}
              forceCompact
            />
            {sectionDefs[activeTab].map((section) => (
              <button
                key={section.id}
                type="button"
                data-section-id={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`block w-full border-l-2 px-4 py-1.5 text-left font-smallcaps text-base tracking-[0.14em] uppercase ${activeSection === section.id ? "border-white text-white" : "border-transparent text-white/40 hover:text-white/75"}`}
                style={
                  activeSection === section.id
                    ? { borderColor: accentColor.value }
                    : undefined
                }
              >
                {section.label}
              </button>
            ))}
          </div>
        </aside>
        <div className="my-3 border-l border-white/10" />
        <div
          ref={contentRef}
          className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-2 custom-scrollbar"
        >
          <SettingsConfigProvider
            value={{ config, tempConfig, setTempConfig, saving }}
          >
            <SettingsSearchContext.Provider value={sidebarQuery}>
              {renderContent()}
            </SettingsSearchContext.Provider>
          </SettingsConfigProvider>
        </div>
      </div>
    </Modal>
  );
}
