export const shortenAddress = (address: string | null) =>
  address
    ? `${address.slice(0, 5)}...${address.slice(address.length - 4)}`
    : "";
