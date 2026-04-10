import crypto from "node:crypto";

type InitializeChapaInput = {
  amount: number;
  email: string;
  first_name: string;
  last_name: string;
  locale: string;
  tx_ref?: string;
  status_token?: string;
};

type ChapaInitializeResponse = {
  status?: string;
  message?: string;
  data?: {
    checkout_url?: string;
  };
};

type ChapaVerifyResponse = {
  status?: string;
  message?: string;
  data?: {
    tx_ref?: string;
    amount?: string | number;
    currency?: string;
    status?: string;
  };
};

const chapaClient = {
  get secretKey() {
    const secretKey = process.env.CHAPA_SECRET_KEY;
    if (!secretKey) {
      throw new Error("Missing CHAPA_SECRET_KEY environment variable.");
    }
    return secretKey;
  },
  get initUrl() {
    return process.env.CHAPA_INIT_URL ?? "https://api.chapa.co/v1/transaction/initialize";
  },
  get verifyUrl() {
    return process.env.CHAPA_VERIFY_URL ?? "https://api.chapa.co/v1/transaction/verify/";
  },
  get authHeaders() {
    return {
      Authorization: `Bearer ${this.secretKey}`
    };
  }
};

export function generateTxRef() {
  return `FKL-TXN-${crypto.randomUUID()}`;
}

export async function initializePayment({
  amount,
  email,
  first_name,
  last_name,
  locale,
  tx_ref,
  status_token
}: InitializeChapaInput) {
  const callbackUrl = process.env.CHAPA_CALLBACK_URL;
  const returnUrlFromEnv = process.env.CHAPA_RETURN_URL;

  if (!callbackUrl || !returnUrlFromEnv) {
    throw new Error("Missing Chapa environment configuration.");
  }

  const paymentTxRef = tx_ref ?? generateTxRef();

  const resolvedReturnUrl = returnUrlFromEnv.includes("{locale}")
    ? returnUrlFromEnv.replace("{locale}", locale)
    : returnUrlFromEnv;

  const returnUrl = new URL(resolvedReturnUrl);
  returnUrl.searchParams.set("tx_ref", paymentTxRef);

  if (status_token) {
    returnUrl.searchParams.set("status_token", status_token);
  }

  const response = await fetch(chapaClient.initUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...chapaClient.authHeaders
    },
    body: JSON.stringify({
      amount: Number(amount.toFixed(2)),
      currency: "ETB",
      email,
      first_name,
      last_name,
      tx_ref: paymentTxRef,
      callback_url: callbackUrl,
      return_url: returnUrl.toString(),
      customization: {
        title: "Fregenet Kidan Lehitsanat",
        description: `FKL Local Donation (${locale.toUpperCase()})`,
        logo: "/images/branding/logo.png"
      }
    })
  });

  const payload = (await response.json()) as ChapaInitializeResponse;
  const checkoutUrl = payload?.data?.checkout_url;

  if (!response.ok || !checkoutUrl) {
    throw new Error(payload?.message ?? "Failed to initialize Chapa payment.");
  }

  return {
    tx_ref: paymentTxRef,
    checkout_url: checkoutUrl,
    payload
  };
}

export async function verifyTransaction(tx_ref: string) {
  const response = await fetch(`${chapaClient.verifyUrl}${encodeURIComponent(tx_ref)}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...chapaClient.authHeaders
    }
  });

  const payload = (await response.json()) as ChapaVerifyResponse;

  if (!response.ok || !payload?.data) {
    throw new Error(payload?.message ?? "Failed to verify Chapa transaction.");
  }

  return payload;
}
