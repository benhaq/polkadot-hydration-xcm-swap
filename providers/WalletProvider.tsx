import {
  web3Accounts,
  web3Enable,
  web3FromAddress,
  web3FromSource,
} from "@polkadot/extension-dapp";
import {
  connectInjectedExtension,
  getInjectedExtensions,
  PolkadotSigner,
  type InjectedExtension,
} from "polkadot-api/pjs-signer";
import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";
import type { Signer } from "@polkadot/api/types";
import AccountSelectModal from "@/components/AccountSelectModal/AccountSelectModal";
import PolkadotWalletSelectModal from "@/components/WalletSelectModal/WalletSelectModal";
import { DAPP_NAME } from "@/constants/constants";
import type { TApiType, TWalletAccount } from "@/app/types";
import { showErrorNotification } from "@/utils/notifications";
import { WalletContext } from "@/providers/WalletContext";

export const STORAGE_ADDRESS_KEY = "paraspell_wallet_address";
const STORAGE_API_TYPE_KEY = "paraspell_api_type";
const STORAGE_EXTENSION_KEY = "paraspell_connected_extension";

const getAddressFromLocalStorage = (): string | undefined => {
  return localStorage.getItem(STORAGE_ADDRESS_KEY) || undefined;
};

const getApiTypeFromLocalStorage = (): TApiType | undefined => {
  const apiType = localStorage.getItem(STORAGE_API_TYPE_KEY);
  return apiType === "PJS" || apiType === "PAPI" ? apiType : undefined;
};

const getExtensionFromLocalStorage = (): string | undefined => {
  return localStorage.getItem(STORAGE_EXTENSION_KEY) || undefined;
};

const setExtensionInLocalStorage = (extensionName: string | undefined) => {
  if (extensionName) {
    localStorage.setItem(STORAGE_EXTENSION_KEY, extensionName);
  } else {
    localStorage.removeItem(STORAGE_EXTENSION_KEY);
  }
};

const DEFAULT_API_TYPE: TApiType = "PAPI";

export const WalletProvider: React.FC<PropsWithChildren<unknown>> = ({
  children,
}) => {
  const [accountsModalOpened, setAccountsModalOpened] = useState(false);
  const [walletSelectModalOpened, setWalletSelectModalOpened] = useState(false);

  const [isLoadingExtensions, setIsLoadingExtensions] = useState(false);

  const [apiType, setApiType] = useState<TApiType>(
    getApiTypeFromLocalStorage() || DEFAULT_API_TYPE
  );

  const [extensions, setExtensions] = useState<string[]>([]);
  const [injectedExtension, setInjectedExtension] =
    useState<InjectedExtension>();

  const [accounts, setAccounts] = useState<TWalletAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<
    TWalletAccount | undefined
  >(undefined);

  const [isInitialized, setIsInitialized] = useState(false);

  const [isUseXcmApiSelected, setIsUseXcmApiSelected] = useState(false);

  useEffect(() => {
    if (apiType) {
      localStorage.setItem(STORAGE_API_TYPE_KEY, apiType);
    }
  }, [apiType]);

  useEffect(() => {
    if (!isInitialized) return;

    if (selectedAccount) {
      localStorage.setItem(STORAGE_ADDRESS_KEY, selectedAccount.address);
    } else {
      localStorage.removeItem(STORAGE_ADDRESS_KEY);
    }
  }, [selectedAccount]);

  useEffect(() => {
    const initializeFromStorage = async () => {
      const savedApiType = getApiTypeFromLocalStorage();
      const savedAddress = getAddressFromLocalStorage();
      const savedExtensionName = getExtensionFromLocalStorage();

      if (savedApiType) {
        setApiType(savedApiType);
      }

      if (savedApiType && savedAddress) {
        if (savedApiType === "PJS") {
          const allInjected = await web3Enable("Paraspell");

          if (!allInjected.length) {
            showErrorNotification(
              "No wallet extension found, install it to connect"
            );
            setAccounts([]);
            setSelectedAccount(undefined);
            return;
          }

          const allAccounts = await web3Accounts();
          const walletAccounts = allAccounts.map((account) => ({
            address: account.address,
            meta: {
              name: account.meta.name,
              source: account.meta.source,
            },
          }));
          setAccounts(walletAccounts);

          const account = walletAccounts.find(
            (acc) => acc.address === savedAddress
          );
          if (account) {
            setSelectedAccount(account);
          } else {
            setSelectedAccount(undefined);
          }
        } else if (savedApiType === "PAPI") {
          const extensions = getInjectedExtensions();
          setExtensions(extensions);

          if (!extensions.length) {
            showErrorNotification(
              "No wallet extension found, install it to connect"
            );
            setAccounts([]);
            setSelectedAccount(undefined);
            return;
          }

          if (!savedExtensionName || !extensions.includes(savedExtensionName)) {
            showErrorNotification("Previously connected extension not found");
            setAccounts([]);
            setSelectedAccount(undefined);
            return;
          }

          const selectedExtension = await connectInjectedExtension(
            savedExtensionName
          );
          setInjectedExtension(selectedExtension);

          const accounts = selectedExtension.getAccounts();

          const walletAccounts = accounts.map((account) => ({
            address: account.address,
            meta: {
              name: account.name,
              source: selectedExtension.name,
            },
          }));
          setAccounts(walletAccounts);

          const account = walletAccounts.find(
            (acc) => acc.address === savedAddress
          );
          if (account) {
            setSelectedAccount(account);
          } else {
            setSelectedAccount(undefined);
          }
        }
      }
      setIsInitialized(true);
    };

    void initializeFromStorage();
  }, []);

  useEffect(() => {
    if (apiType === "PJS" && selectedAccount) {
      void web3Enable(DAPP_NAME);
    }
  }, [selectedAccount, apiType]);

  const getSigner = async (): Promise<PolkadotSigner | Signer> => {
    if (!selectedAccount) {
      throw new Error("No selected account");
    }

    if (apiType === "PJS") {
      const injector = await web3FromAddress(selectedAccount.address);
      return injector.signer as Signer;
    } else {
      const account = injectedExtension
        ?.getAccounts()
        .find((account) => account.address === selectedAccount.address);
      if (!account) {
        throw new Error("No selected account");
      }
      return account.polkadotSigner;
    }
  };

  const initPapiExtensions = () => {
    const extensions = getInjectedExtensions();

    if (!extensions.length) {
      showErrorNotification("No wallet extension found, install it to connect");
      throw Error("No Wallet Extension Found!");
    }

    setExtensions(extensions);
    setWalletSelectModalOpened(true);
  };

  const initPjsExtensions = async () => {
    const extensions = await web3Enable(DAPP_NAME);

    if (!extensions.length) {
      showErrorNotification("No wallet extension found, install it to connect");
      throw Error("No Wallet Extension Found!");
    }

    setExtensions(extensions.map((extension) => extension.name));
    setWalletSelectModalOpened(true);
  };

  const initExtensions = async () => {
    if (apiType === "PJS") {
      await initPjsExtensions();
    } else {
      initPapiExtensions();
    }
  };

  const connectWallet = async () => {
    try {
      setIsLoadingExtensions(true);
      await initExtensions();
      setIsLoadingExtensions(false);
    } catch (e) {
      showErrorNotification("Failed to connect wallet" + JSON.stringify(e));
    }
  };

  const onAccountSelect = (account: TWalletAccount) => {
    setSelectedAccount(account);
    setAccountsModalOpened(false);
  };

  const changeAccount = async () => {
    try {
      if (!accounts.length) {
        await initExtensions();
      }
      setAccountsModalOpened(true);
    } catch {
      showErrorNotification("Failed to change account");
    }
  };

  const handleApiSwitch = (value: string) => {
    setApiType(value as TApiType);
    setSelectedAccount(undefined);
    setAccounts([]);
    setInjectedExtension(undefined);
    setExtensionInLocalStorage(undefined);
    localStorage.removeItem(STORAGE_ADDRESS_KEY);
  };

  const selectPapiWallet = async (walletName: string) => {
    try {
      const selectedExtension = await connectInjectedExtension(walletName);
      setInjectedExtension(selectedExtension);
      setExtensionInLocalStorage(walletName);
      const accounts = selectedExtension.getAccounts();

      if (!accounts.length) {
        showErrorNotification("No accounts found in the selected wallet");
        throw Error("No accounts found in the selected wallet");
      }

      setAccounts(
        accounts.map((account) => ({
          address: account.address,
          meta: {
            name: account.name,
            source: selectedExtension.name,
          },
        }))
      );
      setWalletSelectModalOpened(false);
      setAccountsModalOpened(true);
    } catch {
      showErrorNotification("Failed to connect to wallet");
      setWalletSelectModalOpened(false);
    }
  };

  const selectPjsWallet = async (walletName: string) => {
    try {
      const extension = await web3FromSource(walletName);

      const accounts = await extension.accounts.get();

      setAccounts(
        accounts.map((account) => ({
          address: account.address,
          meta: {
            name: account.name,
            source: extension.name,
          },
        }))
      );
      setWalletSelectModalOpened(false);
      setAccountsModalOpened(true);
    } catch {
      showErrorNotification("Failed to connect to wallet");
    }
  };

  const onWalletSelect = (wallet: string) => {
    return apiType === "PAPI"
      ? void selectPapiWallet(wallet)
      : void selectPjsWallet(wallet);
  };

  const onDisconnect = () => {
    setSelectedAccount(undefined);
    setAccountsModalOpened(false);
  };

  return (
    <>
      <AccountSelectModal
        isOpen={accountsModalOpened}
        onClose={() => setAccountsModalOpened(false)}
        accounts={accounts}
        onAccountSelect={onAccountSelect}
        onDisconnect={selectedAccount ? onDisconnect : undefined}
      />
      <PolkadotWalletSelectModal
        isOpen={walletSelectModalOpened}
        onClose={() => setWalletSelectModalOpened(false)}
        providers={extensions}
        onProviderSelect={onWalletSelect}
      />
      <WalletContext.Provider
        value={{
          apiType,
          setApiType,
          extensions,
          setExtensions,
          injectedExtension,
          setInjectedExtension,
          setExtensionInLocalStorage,
          selectedAccount,
          setSelectedAccount,
          accounts,
          setAccounts,
          getSigner,
          connectWallet,
          changeAccount,
          handleApiSwitch,
          setIsUseXcmApiSelected,
          isUseXcmApiSelected,
          isLoadingExtensions,
          isInitialized,
        }}
      >
        {children}
      </WalletContext.Provider>
    </>
  );
};
