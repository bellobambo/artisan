"use client";

import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Drawer,
  Form,
  Input,
  InputNumber,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Steps,
  Tag,
  Timeline,
  Typography,
  message,
} from "antd";
import { erc7715ProviderActions } from "@metamask/smart-accounts-kit/actions";
import { useMemo, useState } from "react";
import {
  createWalletClient,
  custom,
  encodeFunctionData,
  erc20Abi,
  isAddress,
  parseUnits,
} from "viem";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { appChain, appChainId, usdcAddress } from "@/lib/chain";

const { Paragraph, Text, Title } = Typography;

const navbarButtonStyle = {
  backgroundColor: "transparent",
  borderColor: "#eeeeee",
  color: "#eeeeee",
};

const x402ReviewPriceUsdc =
  process.env.NEXT_PUBLIC_X402_REVIEW_PRICE_USDC ?? "0.01";
const x402SellerAddress = process.env.NEXT_PUBLIC_X402_SELLER_ADDRESS as
  | `0x${string}`
  | undefined;

type BountyStatus = "Open" | "Reviewing" | "Ready" | "Paid" | "Ended";
type PayoutMode = "Even Split" | "Ranked Positions";

type BountySubmission = {
  id: string;
  learner: string;
  link: string;
  submittedAt: string;
  aiScore?: number;
  aiSummary?: string;
  aiStrengths?: string[];
  aiIssues?: string[];
  aiRecommendation?: "Approve" | "Revise" | "Reject";
  rank?: number;
};

type AdvancedPermissionGrant = {
  permissionContext: `0x${string}`;
  delegationManager: `0x${string}`;
  relayerTargetAddress: `0x${string}`;
  expiresAt: number;
};

type OneShotCapabilities = {
  targetAddress?: `0x${string}`;
  tokens?: Array<{ address: string; symbol?: string; decimals?: string | number }>;
  paymentTokens?: Array<{ address: string; symbol?: string; decimals?: string | number }>;
  acceptedTokens?: Array<{ address: string; symbol?: string; decimals?: string | number }>;
  feeTokens?: Array<{ address: string; symbol?: string; decimals?: string | number }>;
  [key: string]: unknown;
};

type OneShotFeeQuote = {
  context?: string;
  expiry?: number;
  minFee?: string;
  rate?: string;
  gasPrice?: string;
  [key: string]: unknown;
};

type X402Challenge = {
  x402?: {
    amount?: string;
    asset?: string;
    chainId?: string;
    payTo?: string;
    resource?: string;
    settlement?: string;
  };
};

type Bounty = {
  id: string;
  title: string;
  description: string;
  community: string;
  resources?: string;
  reward: number;
  token: "USDC";
  status: BountyStatus;
  creator?: string;
  deadlineAt: string;
  reviewPeriodDays: number;
  participantLimit: number;
  payoutMode: PayoutMode;
  positionRewards?: number[];
  endedAt?: string;
  submissions: BountySubmission[];
  learner?: string;
  submission?: string;
  aiScore?: number;
  aiSummary?: string;
  aiStrengths?: string[];
  aiIssues?: string[];
  aiRecommendation?: "Approve" | "Revise" | "Reject";
  txHash?: string;
  relayTaskId?: string;
  relayStatus?: string;
  relayFeeQuote?: OneShotFeeQuote;
  relayCalldata?: `0x${string}`;
  x402ReviewTaskId?: string;
  x402ReviewStatus?: string;
  x402PaymentProof?: string;
};

const initialBounties: Bounty[] = [
  {
    id: "BNT-001",
    title: "Write a beginner guide to MetaMask Smart Accounts",
    description:
      "Create a practical beginner guide that explains smart account permissions and payout safety.",
    community: "MetaMask",
    resources:
      "https://docs.metamask.io/smart-accounts-kit/guides/advanced-permissions/execute-on-metamask-users-behalf/",
    reward: 8,
    token: "USDC",
    status: "Ready",
    creator: "0xAdmin...001",
    deadlineAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    reviewPeriodDays: 1,
    participantLimit: 3,
    payoutMode: "Ranked Positions",
    positionRewards: [5, 2, 1],
    learner: "0x8F3...A91",
    submission: "https://github.com/learner/smart-account-guide",
    submissions: [
      {
        id: "SUB-001",
        learner: "0x8F3...A91",
        link: "https://github.com/learner/smart-account-guide",
        submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
        aiScore: 84,
        aiSummary:
          "The submission introduces MetaMask Smart Accounts clearly and includes beginner-friendly examples.",
        aiStrengths: ["Clear structure", "Relevant sponsor docs", "Practical examples"],
        aiIssues: ["Could add a short security section"],
        aiRecommendation: "Approve",
        rank: 1,
      },
    ],
    aiScore: 84,
    aiSummary:
      "The submission introduces MetaMask Smart Accounts clearly and includes beginner-friendly examples.",
    aiStrengths: ["Clear structure", "Relevant sponsor docs", "Practical examples"],
    aiIssues: ["Could add a short security section"],
    aiRecommendation: "Approve",
  },
  {
    id: "BNT-002",
    title: "Create an OpenAI bounty-review prompt for community builders",
    description:
      "Design a structured review prompt that helps community admins score learner submissions consistently.",
    community: "AI",
    resources: "https://platform.openai.com/docs/guides/structured-outputs",
    reward: 5,
    token: "USDC",
    status: "Reviewing",
    creator: "0xAdmin...002",
    deadlineAt: new Date(Date.now() + 1000 * 60 * 60 * 18).toISOString(),
    reviewPeriodDays: 2,
    participantLimit: 5,
    payoutMode: "Even Split",
    learner: "0x42B...C77",
    submission: "https://gist.github.com/learner/openai-review-prompt",
    submissions: [
      {
        id: "SUB-002",
        learner: "0x42B...C77",
        link: "https://gist.github.com/learner/openai-review-prompt",
        submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      },
    ],
  },
  {
    id: "BNT-003",
    title: "Record a 90-second explainer for ERC-7710 gas abstraction",
    description:
      "Record a short explainer that shows why gas abstraction matters for learner reward payouts.",
    community: "Sui",
    resources: "https://1shotapi.com/docs/quickstarts/gas-sponsorship-eip7710",
    reward: 10,
    token: "USDC",
    status: "Open",
    creator: "0xAdmin...003",
    deadlineAt: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(),
    reviewPeriodDays: 1,
    participantLimit: 4,
    payoutMode: "Even Split",
    submissions: [],
  },
];

const communityOptions = [
  "Solana",
  "Ethereum",
  "MetaMask",
  "Sui",
  "AI",
  "Machine Learning",
  "Content",
  "Video",
  "Writing",
  "DeFi",
  "Design",
  "Security",
].map((value) => ({ value }));

function statusColor(status: BountyStatus) {
  return {
    Open: "#443199",
    Reviewing: "#443199",
    Ready: "#443199",
    Paid: "#443199",
    Ended: "#443199",
  }[status];
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function toDateTimeInputValue(value: string) {
  return value.slice(0, 16);
}

function getSortedSubmissions(bounty: Bounty) {
  return [...bounty.submissions].sort(
    (left, right) => (right.aiScore ?? 0) - (left.aiScore ?? 0),
  );
}

function getReviewEndsAt(bounty: Bounty) {
  const endTime = new Date(bounty.endedAt ?? bounty.deadlineAt).getTime();
  return new Date(endTime + bounty.reviewPeriodDays * 24 * 60 * 60 * 1000);
}

function isBountyEnded(bounty: Bounty) {
  return Boolean(bounty.endedAt) || Date.now() >= new Date(bounty.deadlineAt).getTime();
}

function isReviewPeriodDone(bounty: Bounty) {
  return isBountyEnded(bounty) && Date.now() >= getReviewEndsAt(bounty).getTime();
}

function getLifecycleLabel(bounty: Bounty) {
  if (bounty.status === "Paid") {
    return "Paid";
  }

  if (isReviewPeriodDone(bounty)) {
    return "Ready";
  }

  if (isBountyEnded(bounty)) {
    return "Reviewing";
  }

  return "Open";
}

function getPayoutRows(bounty: Bounty) {
  const ranked = getSortedSubmissions(bounty).slice(0, bounty.participantLimit);

  if (!ranked.length) {
    return [];
  }

  if (bounty.payoutMode === "Ranked Positions" && bounty.positionRewards?.length) {
    return ranked
      .map((submission, index) => ({
        amount: bounty.positionRewards?.[index] ?? 0,
        rank: index + 1,
        submission,
      }))
      .filter((row) => row.amount > 0);
  }

  const splitAmount = bounty.reward / ranked.length;

  return ranked.map((submission, index) => ({
    amount: splitAmount,
    rank: index + 1,
    submission,
  }));
}

export default function Home() {
  const [bounties, setBounties] = useState<Bounty[]>(initialBounties);
  const [selectedId, setSelectedId] = useState(initialBounties[0].id);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isPreparingRelay, setIsPreparingRelay] = useState(false);
  const [isSubmittingRelay, setIsSubmittingRelay] = useState(false);
  const [isCheckingRelay, setIsCheckingRelay] = useState(false);
  const [isPayingX402, setIsPayingX402] = useState(false);
  const [permissionGrant, setPermissionGrant] =
    useState<AdvancedPermissionGrant | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const { address, chainId, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();

  const selectedBounty = useMemo(
    () => bounties.find((bounty) => bounty.id === selectedId) ?? bounties[0],
    [bounties, selectedId],
  );
  const [defaultDeadlineInput] = useState(() =>
      toDateTimeInputValue(
        new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
      ),
  );

  function openBounty(bountyId: string) {
    setSelectedId(bountyId);
    setIsDetailDrawerOpen(true);
  }

  function addBounty(values: {
    title: string;
    description: string;
    community: string | string[];
    resources?: string;
    reward: number;
    deadlineAt: string;
    participantLimit: number;
    reviewPeriodDays: number;
    payoutMode: PayoutMode;
    firstPlace?: number;
    secondPlace?: number;
    thirdPlace?: number;
  }) {
    const positionRewards = [
      values.firstPlace ?? 0,
      values.secondPlace ?? 0,
      values.thirdPlace ?? 0,
    ].filter((amount) => amount > 0);

    const nextBounty: Bounty = {
      id: `BNT-${String(bounties.length + 1).padStart(3, "0")}`,
      title: values.title,
      description: values.description,
      community: Array.isArray(values.community)
        ? values.community[0]
        : values.community,
      resources: values.resources,
      reward: values.reward,
      token: "USDC",
      status: "Open",
      creator: address,
      deadlineAt: new Date(values.deadlineAt).toISOString(),
      reviewPeriodDays: values.reviewPeriodDays,
      participantLimit: values.participantLimit,
      payoutMode:
        values.payoutMode === "Ranked Positions" && positionRewards.length
          ? "Ranked Positions"
          : "Even Split",
      positionRewards,
      submissions: [],
    };

    setBounties((current) => [nextBounty, ...current]);
    setSelectedId(nextBounty.id);
    setIsCreateDrawerOpen(false);
    setIsDetailDrawerOpen(true);
    messageApi.success("Bounty created locally");
  }

  function submitWork(values: { learner: string; submission: string }) {
    if (isBountyEnded(selectedBounty)) {
      messageApi.warning("This bounty has ended and no longer accepts submissions");
      return;
    }

    if (selectedBounty.submissions.length >= selectedBounty.participantLimit) {
      messageApi.warning("This bounty has reached its participant limit");
      return;
    }

    const nextSubmission: BountySubmission = {
      id: `SUB-${selectedBounty.id}-${selectedBounty.submissions.length + 1}`,
      learner: values.learner,
      link: values.submission,
      submittedAt: new Date().toISOString(),
    };

    setBounties((current) =>
      current.map((bounty) =>
        bounty.id === selectedBounty.id
          ? {
              ...bounty,
              learner: values.learner,
              submission: values.submission,
              submissions: [...bounty.submissions, nextSubmission],
              status: "Reviewing",
            }
          : bounty,
      ),
    );
    messageApi.success("Submission added");
  }

  async function payX402ReviewAccess(
    submission: BountySubmission,
    challenge: X402Challenge,
  ) {
    if (!permissionGrant) {
      throw new Error("Request Smart Permission before paid AI review");
    }

    if (!usdcAddress) {
      throw new Error("NEXT_PUBLIC_USDC_ADDRESS is not configured");
    }

    const payTo = challenge.x402?.payTo ?? x402SellerAddress;

    if (!payTo || !isAddress(payTo)) {
      throw new Error("NEXT_PUBLIC_X402_SELLER_ADDRESS is not configured");
    }

    const amount = challenge.x402?.amount ?? x402ReviewPriceUsdc;

    setIsPayingX402(true);

    try {
      const capabilities = await fetchOneShotCapabilities();
      const feeToken = pickPaymentToken(capabilities);

      if (!feeToken) {
        throw new Error("No supported 1Shot payment token found for this chain");
      }

      const feeResponse = await fetch("/api/oneshot/fee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chainId: appChainId, token: feeToken }),
      });
      const feeQuote = await feeResponse.json();

      if (!feeResponse.ok) {
        throw new Error(feeQuote.error ?? "Failed to fetch 1Shot fee quote");
      }

      const paymentCalldata = encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [payTo, parseUnits(amount, 6)],
      });

      const response = await fetch("/api/oneshot/send-7710", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chainId: appChainId,
          permissionContext: permissionGrant.permissionContext,
          target: usdcAddress,
          data: paymentCalldata,
          context: feeQuote.context,
          destinationUrl: "/api/openai/review",
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to submit x402 payment to 1Shot");
      }

      const proof = `oneshot:${result.taskId}`;

      setBounties((current) =>
        current.map((bounty) =>
          bounty.id === selectedBounty.id
            ? {
                ...bounty,
                x402PaymentProof: proof,
                x402ReviewTaskId: result.taskId,
                x402ReviewStatus: `Paid ${amount} USDC for AI review access`,
                relayFeeQuote: feeQuote,
              }
            : bounty,
        ),
      );

      messageApi.success(
        `x402 payment relayed through 1Shot for ${submission.id}`,
      );
      return proof;
    } finally {
      setIsPayingX402(false);
    }
  }

  async function runAiReview() {
    if (!selectedBounty.submissions.length) {
      messageApi.warning("Add learner submissions before running AI review");
      return;
    }

    setIsReviewing(true);

    try {
      const reviewedSubmissions: BountySubmission[] = [];

      for (const submission of selectedBounty.submissions) {
        if (submission.aiScore) {
          reviewedSubmissions.push(submission);
          continue;
        }

        const reviewPayload = {
          title: selectedBounty.title,
          community: selectedBounty.community,
          resources: selectedBounty.resources,
          reward: selectedBounty.reward,
          learner: submission.learner,
          submission: submission.link,
        };

        let response = await fetch("/api/openai/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reviewPayload),
        });

        let review = await response.json();

        if (response.status === 402) {
          const proof = await payX402ReviewAccess(
            submission,
            review as X402Challenge,
          );

          response = await fetch("/api/openai/review", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Payment": proof,
            },
            body: JSON.stringify({
              ...reviewPayload,
              x402PaymentProof: proof,
            }),
          });
          review = await response.json();
        }

        if (!response.ok) {
          throw new Error(review.error ?? "OpenAI review failed");
        }

        reviewedSubmissions.push({
          ...submission,
          aiScore: review.score,
          aiSummary: review.summary,
          aiStrengths: review.strengths,
          aiIssues: review.issues,
          aiRecommendation: review.recommendation,
        });
      }

      const rankedSubmissions = reviewedSubmissions
        .sort((left, right) => (right.aiScore ?? 0) - (left.aiScore ?? 0))
        .map((submission, index) => ({ ...submission, rank: index + 1 }));

      const topSubmission = rankedSubmissions[0];

      setBounties((current) =>
        current.map((bounty) =>
          bounty.id === selectedBounty.id
            ? {
                ...bounty,
                status: isReviewPeriodDone(bounty) ? "Ready" : "Reviewing",
                learner: topSubmission?.learner,
                submission: topSubmission?.link,
                submissions: rankedSubmissions,
                aiScore: topSubmission?.aiScore,
                aiSummary: topSubmission?.aiSummary,
                aiStrengths: topSubmission?.aiStrengths,
                aiIssues: topSubmission?.aiIssues,
                aiRecommendation: topSubmission?.aiRecommendation,
              }
            : bounty,
        ),
      );
      messageApi.success("OpenAI review and ranking completed");
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : "OpenAI review failed",
      );
    } finally {
      setIsReviewing(false);
    }
  }

  async function fetchOneShotCapabilities() {
    const response = await fetch("/api/oneshot/capabilities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chainId: appChainId }),
    });
    const capabilities = await response.json();

    if (!response.ok) {
      throw new Error(capabilities.error ?? "Failed to fetch 1Shot capabilities");
    }

    return capabilities as OneShotCapabilities;
  }

  function pickPaymentToken(capabilities: OneShotCapabilities) {
    const tokenCandidates = [
      ...(capabilities.tokens ?? []),
      ...(capabilities.paymentTokens ?? []),
      ...(capabilities.acceptedTokens ?? []),
      ...(capabilities.feeTokens ?? []),
    ].map((token) => token.address);

    const configuredUsdcAddress = usdcAddress;

    if (configuredUsdcAddress) {
      const matchingToken = tokenCandidates.find(
        (token) => token.toLowerCase() === configuredUsdcAddress.toLowerCase(),
      );

      if (matchingToken) {
        return matchingToken;
      }
    }

    return tokenCandidates[0] ?? configuredUsdcAddress;
  }

  async function requestSmartPermission() {
    if (!isConnected || !address) {
      messageApi.warning("Connect MetaMask first");
      return;
    }

    if (!usdcAddress) {
      messageApi.error("NEXT_PUBLIC_USDC_ADDRESS is not configured");
      return;
    }
    const tokenAddress = usdcAddress;

    if (typeof window === "undefined" || !window.ethereum) {
      messageApi.error("MetaMask extension was not detected");
      return;
    }

    setIsRequestingPermission(true);

    try {
      if (chainId !== appChainId) {
        await switchChainAsync({ chainId: appChainId });
      }

      const capabilities = await fetchOneShotCapabilities();
      const relayerTargetAddress = capabilities.targetAddress;

      if (!relayerTargetAddress || !isAddress(relayerTargetAddress)) {
        throw new Error(
          `1Shot has no targetAddress for chain ${appChainId}. Check that your NEXT_PUBLIC_ONESHOT_RPC_URL is the testnet/mainnet endpoint for this chain, or switch to a chain returned by relayer_getCapabilities.`,
        );
      }

      const walletClient = createWalletClient({
        chain: appChain,
        transport: custom(window.ethereum),
      }).extend(erc7715ProviderActions());

      const currentTime = Math.floor(Date.now() / 1000);
      const expiresAt = currentTime + 60 * 60 * 24 * 7;
      const allowanceAmount = parseUnits("50", 6);

      const grantedPermissions = await walletClient.requestExecutionPermissions([
        {
          chainId: appChainId,
          expiry: expiresAt,
          to: relayerTargetAddress,
          permission: {
            type: "erc20-token-allowance",
            data: {
              tokenAddress,
              allowanceAmount,
              startTime: currentTime,
              justification:
                "Allow Artisan to execute approved community bounty payouts through the 1Shot relayer.",
            },
            isAdjustmentAllowed: true,
          },
        },
      ]);

      const grant = grantedPermissions[0];

      if (!grant?.context || !grant.delegationManager) {
        throw new Error("MetaMask did not return a permission context");
      }

      setPermissionGrant({
        permissionContext: grant.context,
        delegationManager: grant.delegationManager,
        relayerTargetAddress,
        expiresAt,
      });
      messageApi.success("Advanced Permission granted");
    } catch (error) {
      messageApi.error(
        error instanceof Error
          ? error.message
          : "Failed to request Advanced Permission",
      );
    } finally {
      setIsRequestingPermission(false);
    }
  }

  async function approvePayout() {
    if (!permissionGrant) {
      messageApi.warning("Request Smart Permission before payout");
      return;
    }

    if (!selectedBounty.learner || !isAddress(selectedBounty.learner)) {
      messageApi.error("Add a valid learner wallet address");
      return;
    }

    if (!usdcAddress) {
      messageApi.error("NEXT_PUBLIC_USDC_ADDRESS is not configured");
      return;
    }

    const payoutRows = getPayoutRows(selectedBounty);
    const firstPayout = payoutRows[0];

    if (!firstPayout) {
      messageApi.warning("There are no ranked submissions to pay");
      return;
    }

    if (!isAddress(firstPayout.submission.learner)) {
      messageApi.error("Top ranked learner does not have a valid wallet address");
      return;
    }

    const payoutRecipient = firstPayout.submission.learner;

    setIsPreparingRelay(true);

    try {
      const capabilities = await fetchOneShotCapabilities();
      const feeToken = pickPaymentToken(capabilities);

      if (!feeToken) {
        throw new Error("No supported 1Shot payment token found for this chain");
      }

      const feeResponse = await fetch("/api/oneshot/fee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chainId: appChainId, token: feeToken }),
      });
      const feeQuote = await feeResponse.json();

      if (!feeResponse.ok) {
        throw new Error(feeQuote.error ?? "Failed to fetch 1Shot fee quote");
      }

      const transferCalldata = encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [payoutRecipient, parseUnits(String(firstPayout.amount), 6)],
      });

      setBounties((current) =>
        current.map((bounty) =>
          bounty.id === selectedBounty.id
            ? {
                ...bounty,
                relayStatus: "Prepared 1Shot relay bundle",
                relayFeeQuote: feeQuote,
                relayCalldata: transferCalldata,
              }
            : bounty,
        ),
      );
      messageApi.success("1Shot fee quote and payout calldata prepared");
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : "Failed to prepare payout",
      );
    } finally {
      setIsPreparingRelay(false);
    }
  }

  function endBountyManually() {
    setBounties((current) =>
      current.map((bounty) =>
        bounty.id === selectedBounty.id
          ? {
              ...bounty,
              endedAt: new Date().toISOString(),
              status: bounty.submissions.length ? "Reviewing" : "Ended",
            }
          : bounty,
      ),
    );
    messageApi.success("Bounty ended manually");
  }

  function queueAutomaticDisbursement() {
    if (!isReviewPeriodDone(selectedBounty)) {
      messageApi.warning("Review period is not complete yet");
      return;
    }

    if (!selectedBounty.submissions.some((submission) => submission.aiScore)) {
      messageApi.warning("Run AI review before automatic disbursement");
      return;
    }

    setBounties((current) =>
      current.map((bounty) =>
        bounty.id === selectedBounty.id
          ? {
              ...bounty,
              status: "Ready",
              relayStatus:
                "Automatic disbursement ready through smart account delegation",
            }
          : bounty,
      ),
    );
    messageApi.success("Automatic disbursement is ready");
  }

  async function submitRelayTransaction() {
    if (!permissionGrant) {
      messageApi.warning("Request Smart Permission before payout");
      return;
    }

    if (!selectedBounty.relayCalldata) {
      messageApi.warning("Prepare the 1Shot payout first");
      return;
    }

    if (!usdcAddress) {
      messageApi.error("NEXT_PUBLIC_USDC_ADDRESS is not configured");
      return;
    }

    setIsSubmittingRelay(true);

    try {
      const response = await fetch("/api/oneshot/send-7710", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chainId: appChainId,
          permissionContext: permissionGrant.permissionContext,
          target: usdcAddress,
          data: selectedBounty.relayCalldata,
          context: selectedBounty.relayFeeQuote?.context,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to submit 1Shot relay");
      }

      setBounties((current) =>
        current.map((bounty) =>
          bounty.id === selectedBounty.id
            ? {
                ...bounty,
                relayTaskId: result.taskId,
                relayStatus: "Submitted to 1Shot",
              }
            : bounty,
        ),
      );
      messageApi.success("Submitted to 1Shot relayer");
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : "Failed to submit relay",
      );
    } finally {
      setIsSubmittingRelay(false);
    }
  }

  async function checkRelayStatus() {
    if (!selectedBounty.relayTaskId) {
      messageApi.warning("Submit the relay transaction first");
      return;
    }

    setIsCheckingRelay(true);

    try {
      const response = await fetch("/api/oneshot/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: selectedBounty.relayTaskId }),
      });
      const status = await response.json();

      if (!response.ok) {
        throw new Error(status.error ?? "Failed to fetch relay status");
      }

      const statusText =
        status.status === 200
          ? "Confirmed"
          : status.status === 110
            ? "Submitted onchain"
            : status.status === 100
              ? "Pending"
              : status.message ?? `Status ${status.status}`;

      setBounties((current) =>
        current.map((bounty) =>
          bounty.id === selectedBounty.id
            ? {
                ...bounty,
                status: status.status === 200 ? "Paid" : bounty.status,
                relayStatus: statusText,
                txHash:
                  status.receipt?.transactionHash ?? status.hash ?? bounty.txHash,
              }
            : bounty,
        ),
      );
      messageApi.success(`Relay status: ${statusText}`);
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : "Failed to fetch relay status",
      );
    } finally {
      setIsCheckingRelay(false);
    }
  }

  function connectMetaMask() {
    const metaMaskConnector =
      connectors.find((connector) =>
        connector.name.toLowerCase().includes("metamask"),
      ) ?? connectors[0];

    if (!metaMaskConnector) {
      messageApi.error("No injected wallet connector found");
      return;
    }

    connect({ connector: metaMaskConnector });
  }

  return (
    <main className="artisan-shell min-h-screen text-[#555555]">
      {contextHolder}
      <div className="sticky top-0 z-20 border-b border-[#443199] bg-[#443199] px-4 py-3 shadow-sm sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-3">
          <Button className="navbar-button !font-extrabold" style={navbarButtonStyle}>
            Artisan
          </Button>
          <Space wrap className="justify-end">
            {isConnected ? (
              <Text className="font-bold !text-white">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </Text>
            ) : null}
            {isConnected ? (
              <Button
                className="navbar-button"
                onClick={() => disconnect()}
                style={navbarButtonStyle}
              >
                Disconnect
              </Button>
            ) : (
              <Button
                className="navbar-button"
                loading={isPending}
                onClick={connectMetaMask}
                style={navbarButtonStyle}
              >
                Connect MetaMask
              </Button>
            )}
          </Space>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex justify-end">
          <Space wrap>
            <Button
              disabled={!isConnected}
              loading={isRequestingPermission}
              onClick={requestSmartPermission}
              type="primary"
            >
              Request Smart Permission
            </Button>
            <Button
              className="artisan-ghost-button !bg-[#dddddd]"
              onClick={() => setSelectedId(initialBounties[0].id)}
            >
              Records
            </Button>
            <Button
              className="artisan-ghost-button !bg-[#dddddd]"
              onClick={() => setIsCreateDrawerOpen(true)}
            >
              Create Bounty
            </Button>
          </Space>
        </div>

        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <Title level={2} className="!m-0 !text-2xl !text-[#555555]">
                Community bounties
              </Title>
              <Text className="!text-[#555555]">
                {bounties.length} active records
              </Text>
            </div>
            <Space wrap>
              <Tag color="#443199">MVP local state</Tag>
              <Button type="primary" onClick={() => setIsCreateDrawerOpen(true)}>
                Create bounty
              </Button>
            </Space>
          </div>

          <Row gutter={[16, 16]} justify="start">
            {bounties.map((bounty) => (
              <Col key={bounty.id} xs={24} sm={12} lg={8} xl={8}>
                <Card
                  bordered={false}
                  className="artisan-card artisan-muted-card bounty-card h-full"
                  extra={
                    <Tag color={statusColor(getLifecycleLabel(bounty))}>
                      {getLifecycleLabel(bounty)}
                    </Tag>
                  }
                  title={bounty.id}
                >
                  <button
                    className="mb-4 block w-full text-left"
                    onClick={() => openBounty(bounty.id)}
                    type="button"
                  >
                    <Text className="block text-sm font-extrabold !text-[#555555]">
                      {bounty.title}
                    </Text>
                    <Text className="block pt-1 text-xs !text-[#555555] opacity-75">
                      {bounty.community}
                    </Text>
                  </button>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <div>
                      <Text className="block text-xs !text-[#555555] opacity-75">
                        Price
                      </Text>
                      <Text strong className="!text-[#555555]">
                        {bounty.reward} {bounty.token}
                      </Text>
                    </div>
                    <div className="text-right">
                      <Text className="block text-xs !text-[#555555] opacity-75">
                        Participants
                      </Text>
                      <Text strong className="!text-[#555555]">
                        {bounty.submissions.length}/{bounty.participantLimit}
                      </Text>
                    </div>
                    <div>
                      <Text className="block text-xs !text-[#555555] opacity-75">
                        Deadline
                      </Text>
                      <Text strong className="!text-[#555555]">
                        {formatDateTime(bounty.deadlineAt)}
                      </Text>
                    </div>
                    <div className="text-right">
                      <Text className="block text-xs !text-[#555555] opacity-75">
                        Payout
                      </Text>
                      <Text strong className="!text-[#555555]">
                        {bounty.payoutMode}
                      </Text>
                    </div>
                  </div>

                  <Divider className="!my-3 !border-[#443199]/80" />

                  <div className="flex justify-end gap-2">
                    <Button
                      className="artisan-ghost-button"
                      onClick={() => openBounty(bounty.id)}
                    >
                      Open
                    </Button>
                    <Button
                      type="primary"
                      onClick={() => openBounty(bounty.id)}
                    >
                      Review
                    </Button>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </section>
      </div>

      <Drawer
        destroyOnHidden
        onClose={() => setIsCreateDrawerOpen(false)}
        open={isCreateDrawerOpen}
        placement="right"
        title="Create bounty"
        width={560}
      >
        <Form
          initialValues={{
            deadlineAt: defaultDeadlineInput,
            participantLimit: 3,
            payoutMode: "Even Split",
            reviewPeriodDays: 1,
          }}
          layout="vertical"
          onFinish={addBounty}
        >
          <Form.Item
            label="Task title"
            name="title"
            rules={[{ required: true, message: "Add a bounty title" }]}
          >
            <Input placeholder="Review a beginner Solidity guide" />
          </Form.Item>
          <Form.Item
            label="Description"
            name="description"
            rules={[{ required: true, message: "Add bounty details" }]}
          >
            <Input.TextArea
              autoSize={{ minRows: 3, maxRows: 5 }}
              placeholder="State what participants should build, submit, or prove."
            />
          </Form.Item>
          <Form.Item
            label="Community"
            name="community"
            rules={[{ required: true, message: "Add a community name" }]}
          >
            <Select
              maxCount={1}
              mode="tags"
              options={communityOptions}
              placeholder="Select or type a community"
            />
          </Form.Item>
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Deadline"
                name="deadlineAt"
                rules={[{ required: true, message: "Add deadline date and time" }]}
              >
                <Input type="datetime-local" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Review period"
                name="reviewPeriodDays"
                rules={[{ required: true, message: "Add review days" }]}
              >
                <InputNumber
                  addonAfter="days"
                  className="!w-full"
                  min={1}
                  max={30}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Total price"
                name="reward"
                rules={[{ required: true, message: "Add a USDC reward" }]}
              >
                <InputNumber
                  addonAfter="USDC"
                  className="!w-full"
                  min={1}
                  max={500}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Participants"
                name="participantLimit"
                rules={[{ required: true, message: "Add participant count" }]}
              >
                <InputNumber className="!w-full" min={1} max={100} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            initialValue="Even Split"
            label="Payout rule"
            name="payoutMode"
          >
            <Select
              options={[
                { value: "Even Split" },
                { value: "Ranked Positions" },
              ]}
            />
          </Form.Item>
          <Row gutter={12}>
            <Col xs={24} md={8}>
              <Form.Item label="1st place" name="firstPlace">
                <InputNumber addonAfter="USDC" className="!w-full" min={0} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="2nd place" name="secondPlace">
                <InputNumber addonAfter="USDC" className="!w-full" min={0} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="3rd place" name="thirdPlace">
                <InputNumber addonAfter="USDC" className="!w-full" min={0} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            extra="Optional: add docs, starter repos, videos, examples, or any reference links learners should use."
            label="Resources"
            name="resources"
          >
            <Input.TextArea
              autoSize={{ minRows: 3, maxRows: 5 }}
              placeholder="https://docs.example.com&#10;https://github.com/community/starter"
            />
          </Form.Item>
          <Button block htmlType="submit" type="primary">
            Create bounty
          </Button>
        </Form>
      </Drawer>

      <Drawer
        destroyOnHidden={false}
        onClose={() => setIsDetailDrawerOpen(false)}
        open={isDetailDrawerOpen}
        placement="right"
        title={selectedBounty.title}
        width={720}
        extra={
          <Tag color={statusColor(getLifecycleLabel(selectedBounty))}>
            {getLifecycleLabel(selectedBounty)}
          </Tag>
        }
      >
        <Space direction="vertical" size="large" className="w-full">
          <Alert
            message="Bounty lifecycle"
            description="Users submit before the deadline, AI reviews and ranks submissions during the review period, then funds can be released manually or queued for delegated smart-account disbursement."
            type="info"
            showIcon
          />

          <Row gutter={[12, 12]}>
            <Col xs={24} md={8}>
              <Card className="artisan-muted-card" size="small">
                <Statistic title="Price" suffix={selectedBounty.token} value={selectedBounty.reward} />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card className="artisan-muted-card" size="small">
                <Statistic title="Submissions" suffix={`/ ${selectedBounty.participantLimit}`} value={selectedBounty.submissions.length} />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card className="artisan-muted-card" size="small">
                <Statistic title="Review days" value={selectedBounty.reviewPeriodDays} />
              </Card>
            </Col>
          </Row>

          <Card className="artisan-muted-card" size="small" title="Bounty details">
            <Space direction="vertical" className="w-full">
              <Paragraph className="!mb-0 !text-[#555555]">
                {selectedBounty.description}
              </Paragraph>
              <Text className="!text-[#555555]">
                Deadline: <Text strong>{formatDateTime(selectedBounty.deadlineAt)}</Text>
              </Text>
              <Text className="!text-[#555555]">
                Review ends:{" "}
                <Text strong>{formatDateTime(getReviewEndsAt(selectedBounty).toISOString())}</Text>
              </Text>
              <Text className="!text-[#555555]">
                Payout rule: <Text strong>{selectedBounty.payoutMode}</Text>
              </Text>
              <Text className="!text-[#555555]">
                Creator: <Text strong>{selectedBounty.creator ?? "Connected wallet"}</Text>
              </Text>
            </Space>
          </Card>

          {selectedBounty.resources ? (
            <Card className="artisan-muted-card" size="small" title="Bounty resources">
              <Paragraph className="!mb-0 whitespace-pre-line !text-[#555555]">
                {selectedBounty.resources}
              </Paragraph>
            </Card>
          ) : null}

          <Card className="artisan-muted-card" size="small" title="Submit to bounty">
            <Form key={selectedBounty.id} layout="vertical" onFinish={submitWork}>
              <Row gutter={12}>
                <Col xs={24} md={10}>
                  <Form.Item
                    label="Learner wallet"
                    name="learner"
                    initialValue={selectedBounty.learner}
                    rules={[{ required: true, message: "Add learner wallet" }]}
                  >
                    <Input placeholder="0x..." />
                  </Form.Item>
                </Col>
                <Col xs={24} md={14}>
                  <Form.Item
                    label="Submission link"
                    name="submission"
                    initialValue={selectedBounty.submission}
                    rules={[{ required: true, message: "Add proof link" }]}
                  >
                    <Input placeholder="GitHub, demo, article, or video URL" />
                  </Form.Item>
                </Col>
              </Row>
              <Button
                className="artisan-ghost-button"
                disabled={
                  isBountyEnded(selectedBounty) ||
                  selectedBounty.submissions.length >= selectedBounty.participantLimit
                }
                htmlType="submit"
              >
                Submit work
              </Button>
            </Form>
          </Card>

          <Divider />

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card className="artisan-muted-card" size="small" title="AI ranking">
                <Space direction="vertical" className="w-full">
                  <Progress
                    percent={selectedBounty.aiScore ?? 0}
                    strokeColor="#443199"
                  />
                  <Text>
                    Recommendation:{" "}
                    <Text strong>{selectedBounty.aiRecommendation ?? "Not reviewed"}</Text>
                  </Text>
                  <Paragraph className="!mb-0 !text-[#555555]">
                    {selectedBounty.aiSummary ??
                      "Run OpenAI review after a learner submits work."}
                  </Paragraph>
                  <Text className="!text-[#555555]">
                    x402:{" "}
                    <Text strong>
                      {selectedBounty.x402ReviewStatus ??
                        `${x402ReviewPriceUsdc} USDC required for AI review`}
                    </Text>
                  </Text>
                  {selectedBounty.aiStrengths?.length ? (
                    <Text className="!text-[#555555]">
                      Strengths: {selectedBounty.aiStrengths.join(", ")}
                    </Text>
                  ) : null}
                  {selectedBounty.aiIssues?.length ? (
                    <Text className="!text-[#555555]">
                      Issues: {selectedBounty.aiIssues.join(", ")}
                    </Text>
                  ) : null}
                  <Divider className="!my-2 !border-[#443199]/80" />
                  {getSortedSubmissions(selectedBounty).length ? (
                    getSortedSubmissions(selectedBounty).map((submission, index) => (
                      <div
                        className="flex items-start justify-between gap-3"
                        key={submission.id}
                      >
                        <div>
                          <Text strong className="!text-[#555555]">
                            #{submission.rank ?? index + 1} {submission.learner}
                          </Text>
                          <Text className="block text-xs !text-[#555555] opacity-75">
                            {submission.link}
                          </Text>
                        </div>
                        <Text strong className="!text-[#555555]">
                          {submission.aiScore ? `${submission.aiScore}%` : "Pending"}
                        </Text>
                      </div>
                    ))
                  ) : (
                    <Text className="!text-[#555555]">No submissions yet</Text>
                  )}
                  <Button
                    className="artisan-ghost-button"
                    loading={isReviewing || isPayingX402}
                    onClick={runAiReview}
                  >
                    Pay x402 and run AI review
                  </Button>
                </Space>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card className="artisan-muted-card" size="small" title="Disbursement">
                <Space direction="vertical" className="w-full">
                  <Text>
                    Deadline:{" "}
                    <Text strong>
                      {isBountyEnded(selectedBounty) ? "Ended" : "Open"}
                    </Text>
                  </Text>
                  <Text>
                    Review window:{" "}
                    <Text strong>
                      {isReviewPeriodDone(selectedBounty) ? "Complete" : "Active"}
                    </Text>
                  </Text>
                  <Text>
                    Delegation:{" "}
                    <Text strong>{permissionGrant ? "Granted" : "Not granted"}</Text>
                  </Text>
                  <Divider className="!my-2 !border-[#443199]/80" />
                  {getPayoutRows(selectedBounty).length ? (
                    getPayoutRows(selectedBounty).map((row) => (
                      <div
                        className="flex items-center justify-between gap-3"
                        key={row.submission.id}
                      >
                        <Text className="!text-[#555555]">
                          #{row.rank} {row.submission.learner}
                        </Text>
                        <Text strong className="!text-[#555555]">
                          {row.amount.toFixed(2)} {selectedBounty.token}
                        </Text>
                      </div>
                    ))
                  ) : (
                    <Text className="!text-[#555555]">
                      Payouts appear after submissions are reviewed.
                    </Text>
                  )}
                  <Button
                    className="artisan-ghost-button"
                    disabled={isBountyEnded(selectedBounty)}
                    onClick={endBountyManually}
                  >
                    End bounty manually
                  </Button>
                  <Button
                    className="artisan-ghost-button"
                    disabled={!isReviewPeriodDone(selectedBounty)}
                    onClick={queueAutomaticDisbursement}
                  >
                    Queue automatic disbursement
                  </Button>
                  <Button
                    disabled={
                      !selectedBounty.learner ||
                      !permissionGrant ||
                      !getPayoutRows(selectedBounty).length
                    }
                    loading={isPreparingRelay}
                    onClick={approvePayout}
                    type="primary"
                  >
                    Prepare first payout
                  </Button>
                  <Button
                    disabled={!selectedBounty.relayCalldata}
                    loading={isSubmittingRelay}
                    onClick={submitRelayTransaction}
                    className="artisan-ghost-button"
                    type="default"
                  >
                    Submit to 1Shot
                  </Button>
                  <Button
                    disabled={!selectedBounty.relayTaskId}
                    loading={isCheckingRelay}
                    onClick={checkRelayStatus}
                    className="artisan-ghost-button"
                  >
                    Check relay status
                  </Button>
                  <Text className="!text-[#555555]">
                    Relay: <Text strong>{selectedBounty.relayStatus ?? "Not prepared"}</Text>
                  </Text>
                </Space>
              </Card>
            </Col>
          </Row>

          <Card className="artisan-muted-card" title="Integration map">
            <Timeline
              items={[
                {
                  color: "#443199",
                  children:
                    "MetaMask: connect admin wallet and request Advanced Permission or create a smart account.",
                },
                {
                  color: "#443199",
                  children:
                    "OpenAI: score the learner submission and return structured JSON for the admin.",
                },
                {
                  color: "#443199",
                  children:
                    "1Shot: quote and relay the ERC-7710 USDC transfer so the payout avoids native gas friction.",
                },
                {
                  color: "#443199",
                  children:
                    "Persist bounties, resources, AI review output, and transaction hashes in MongoDB.",
                },
              ]}
            />
            <Steps
              className="mt-4"
              current={
                selectedBounty.status === "Paid"
                  ? 3
                  : getLifecycleLabel(selectedBounty) === "Ready"
                    ? 2
                    : getLifecycleLabel(selectedBounty) === "Reviewing"
                      ? 1
                      : 0
              }
              direction="vertical"
              items={[
                { title: "Bounty open" },
                { title: "Deadline/manual end reached" },
                { title: "AI ranked and review period complete" },
                { title: "Funds disbursed through delegation" },
              ]}
            />
          </Card>
        </Space>
      </Drawer>
    </main>
  );
}
