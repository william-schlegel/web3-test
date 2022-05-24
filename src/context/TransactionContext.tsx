import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

import { contractABI, contractAddress } from "../utils/constants";

export const TransactionContext = React.createContext<any | null>(null);

const { ethereum }: any | null = window;

interface IFormData {
  addressTo: string;
  amount: string;
  keyword: string;
  message: string;
}

export interface ITransaction {
  addressFrom: string;
  addressTo: string;
  timeStamp: string;
  amount: number;
  keyword: string;
  message: string;
}

const getEthereumContract = () => {
  const provider = new ethers.providers.Web3Provider(ethereum);
  const signer = provider.getSigner();
  const transactionContract = new ethers.Contract(
    contractAddress,
    contractABI,
    signer
  );
  return transactionContract;
};

export const TransactionProvider = ({ children }: { children: any }) => {
  const [currentAccount, setCurrentAccount] = useState<string | null>(null);
  const [formData, setFormData] = useState<IFormData>({
    addressTo: "",
    amount: "",
    keyword: "",
    message: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [transactionCount, setTransactionCount] = useState(
    localStorage.getItem("transactioncount") || 0
  );
  const [transactions, setTransactions] = useState<ITransaction[]>([]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    name: string
  ) => {
    setFormData((formData) => ({ ...formData, [name]: e.target.value }));
  };

  const getAllTransactions = async () => {
    try {
      if (!ethereum) return alert("Install metamask");
      const transactionContract = getEthereumContract();
      const availableTransactions =
        await transactionContract.getAllTransactions();
      const transactions = availableTransactions.map(
        (transaction: any): ITransaction => ({
          addressTo: transaction.receiver,
          addressFrom: transaction.sender,
          timeStamp: new Date(
            transaction.timestamp.toNumber() * 1000
          ).toLocaleDateString(),
          message: transaction.message,
          keyword: transaction.keyword,
          amount: parseInt(transaction.amount._hex) / 10 ** 18,
        })
      );
      setTransactions(transactions);
    } catch (error) {
      console.log(error);
      throw new Error("no ethereum object");
    }
  };

  const checkIfWalletIsConnected = async () => {
    try {
      if (!ethereum) return alert("Install metamask");
      const accounts = await ethereum.request({ method: "eth_accounts" });
      if (accounts.length) {
        console.log(accounts[0]);
        setCurrentAccount(accounts[0]);
        getAllTransactions();
      } else {
        console.log("no account found");
      }
    } catch (error) {
      console.log(error);
      throw new Error("no ethereum object");
    }
  };

  const checkIfTransactinsExist = async () => {
    try {
      const transactionContract = getEthereumContract();
      const transactionCount = await transactionContract.getTransactionCount();
      window.localStorage.setItem("transactioncount", transactionCount);
    } catch (error) {
      console.log(error);
      throw new Error("no ethereum object");
    }
  };

  useEffect(() => {
    checkIfWalletIsConnected();
    checkIfTransactinsExist();
  }, []);

  const connectWallet = async () => {
    try {
      if (!ethereum) return alert("Install metamask");
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });
      setCurrentAccount(accounts[0]);
    } catch (error) {
      console.log(error);
      throw new Error("no ethereum object");
    }
  };

  const sendTransaction = async () => {
    try {
      if (!ethereum) return alert("Install metamask");
      const { addressTo, amount, keyword, message } = formData;
      const transactionContract = getEthereumContract();
      const amountInGwei = ethers.utils.parseEther(amount);

      await ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: currentAccount,
            to: addressTo,
            gas: "0x5208",
            value: amountInGwei._hex,
          },
        ],
      });

      const transactionHash = await transactionContract.addToBlockchain(
        addressTo,
        amountInGwei,
        message,
        keyword
      );
      setIsLoading(true);
      console.log(`Loading - ${transactionHash.hash}`);
      await transactionHash.wait();
      console.log(`Success - ${transactionHash.hash}`);
      setIsLoading(false);
      const transactionCount = await transactionContract.getTransactionCount();
      setTransactionCount(transactionCount.toNumber());
      getAllTransactions();
    } catch (error) {
      console.log(error);
      throw new Error("no ethereum object");
    }
  };

  return (
    <TransactionContext.Provider
      value={{
        connectWallet,
        currentAccount,
        handleChange,
        formData,
        sendTransaction,
        transactions,
        isLoading,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
};
