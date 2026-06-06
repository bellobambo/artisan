"use client";

import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Steps,
  Table,
  Tag,
  Timeline,
  Typography,
  message,
} from "antd";
import { erc7715ProviderActions } from "@metamask/smart-accounts-kit/actions";
import type { ColumnsType } from "antd/es/table";
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

type BountyStatus = "Open" | "Submitted" | "AI Reviewed" | "Paid";

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

type Bounty = {
  id: string;
  title: string;
  community: string;
  resources?: string;
  reward: number;
  token: "USDC";
  status: BountyStatus;
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
};

const initialBounties: Bounty[] = [
  {
    id: "BNT-001",
    title: "Write a beginner guide to MetaMask Smart Accounts",
    community: "HackQuest Learners",
    resources:
      "https://docs.metamask.io/smart-accounts-kit/guides/advanced-permissions/execute-on-metamask-users-behalf/",
    reward: 8,
    token: "USDC",
    status: "AI Reviewed",
    learner: "0x8F3...A91",
    submission: "https://github.com/learner/smart-account-guide",
    aiScore: 84,
    aiSummary:
      "The submission introduces MetaMask Smart Accounts clearly and includes beginner-friendly examples.",
    aiStrengths: ["Clear structure", "Relevant sponsor docs", "Practical examples"],
    aiIssues: ["Could add a short security section"],
    aiRecommendation: "Approve",
  },
  {
    id: "BNT-002",
    title: "Create a Venice AI quickstart for community builders",
    community: "AI Builders Guild",
    resources: "https://docs.venice.ai/overview/about-venice",
    reward: 5,
    token: "USDC",
    status: "Submitted",
    learner: "0x42B...C77",
    submission: "https://gist.github.com/learner/venice-quickstart",
  },
  {
    id: "BNT-003",
    title: "Record a 90-second explainer for ERC-7710 gas abstraction",
    community: "Campus Web3 Club",
    resources: "https://1shotapi.com/docs/quickstarts/gas-sponsorship-eip7710",
    reward: 10,
    token: "USDC",
    status: "Open",
  },
];

function statusColor(status: BountyStatus) {
  return {
    Open: "blue",
    Submitted: "gold",
    "AI Reviewed": "green",
    Paid: "purple",
  }[status];
}

export default function Home() {
  const [bounties, setBounties] = useState<Bounty[]>(initialBounties);
  const [selectedId, setSelectedId] = useState(initialBounties[0].id);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isPreparingRelay, setIsPreparingRelay] = useState(false);
  const [isSubmittingRelay, setIsSubmittingRelay] = useState(false);
  const [isCheckingRelay, setIsCheckingRelay] = useState(false);
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

  const stats = useMemo(
    () => ({
      open: bounties.filter((bounty) => bounty.status === "Open").length,
      reviewed: bounties.filter((bounty) => bounty.status === "AI Reviewed")
        .length,
      paid: bounties.filter((bounty) => bounty.status === "Paid").length,
      rewards: bounties.reduce((total, bounty) => total + bounty.reward, 0),
    }),
    [bounties],
  );

  const columns: ColumnsType<Bounty> = [
    {
      title: "Bounty",
      dataIndex: "title",
      key: "title",
      render: (title, bounty) => (
        <button
          className="text-left font-medium text-slate-900 hover:text-teal-700"
          onClick={() => setSelectedId(bounty.id)}
          type="button"
        >
          {title}
          <span className="block text-xs font-normal text-slate-500">
            {bounty.community}
          </span>
        </button>
      ),
    },
    {
      title: "Reward",
      key: "reward",
      render: (_, bounty) => `${bounty.reward} ${bounty.token}`,
      width: 120,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: BountyStatus) => (
        <Tag color={statusColor(status)}>{status}</Tag>
      ),
      width: 140,
    },
  ];

  function addBounty(values: {
    title: string;
    community: string;
    resources?: string;
    reward: number;
  }) {
    const nextBounty: Bounty = {
      id: `BNT-${String(bounties.length + 1).padStart(3, "0")}`,
      title: values.title,
      community: values.community,
      resources: values.resources,
      reward: values.reward,
      token: "USDC",
      status: "Open",
    };

    setBounties((current) => [nextBounty, ...current]);
    setSelectedId(nextBounty.id);
    messageApi.success("Bounty created locally");
  }

  function submitWork(values: { learner: string; submission: string }) {
    setBounties((current) =>
      current.map((bounty) =>
        bounty.id === selectedBounty.id
          ? {
              ...bounty,
              learner: values.learner,
              submission: values.submission,
              status: "Submitted",
            }
          : bounty,
      ),
    );
    messageApi.success("Submission added");
  }

  async function runAiReview() {
    if (!selectedBounty.submission) {
      messageApi.warning("Add a learner submission before running AI review");
      return;
    }

    setIsReviewing(true);

    try {
      const response = await fetch("/api/venice/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: selectedBounty.title,
          community: selectedBounty.community,
          resources: selectedBounty.resources,
          reward: selectedBounty.reward,
          learner: selectedBounty.learner,
          submission: selectedBounty.submission,
        }),
      });

      const review = await response.json();

      if (!response.ok) {
        throw new Error(review.error ?? "Venice review failed");
      }

      setBounties((current) =>
        current.map((bounty) =>
          bounty.id === selectedBounty.id
            ? {
                ...bounty,
                status: "AI Reviewed",
                aiScore: review.score,
                aiSummary: review.summary,
                aiStrengths: review.strengths,
                aiIssues: review.issues,
                aiRecommendation: review.recommendation,
              }
            : bounty,
        ),
      );
      messageApi.success("Venice review completed");
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : "Venice review failed",
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
        args: [selectedBounty.learner, parseUnits(String(selectedBounty.reward), 6)],
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
    <main className="min-h-screen bg-[#f7faf9] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      {contextHolder}
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-[8px] border border-teal-900/10 bg-white px-5 py-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <Text className="text-sm font-semibold uppercase tracking-[0.08em] text-teal-700">
              Artisan
            </Text>
            <Title level={1} className="!mb-1 !mt-1 !text-3xl md:!text-4xl">
              SkillBounty Board
            </Title>
            <Paragraph className="!mb-0 max-w-3xl !text-base !text-slate-600">
              Community task rewards with Venice AI review, MetaMask Smart
              Account permissions, and 1Shot gas-abstracted payouts.
            </Paragraph>
          </div>
          <Space wrap>
            {isConnected ? (
              <Button onClick={() => disconnect()}>
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </Button>
            ) : (
              <Button loading={isPending} onClick={connectMetaMask}>
                Connect MetaMask
              </Button>
            )}
            <Button
              disabled={!isConnected}
              loading={isRequestingPermission}
              onClick={requestSmartPermission}
              type="primary"
            >
              Request Smart Permission
            </Button>
          </Space>
        </header>

        <Row gutter={[16, 16]}>
          <Col xs={12} lg={6}>
            <Card>
              <Statistic title="Open bounties" value={stats.open} />
            </Card>
          </Col>
          <Col xs={12} lg={6}>
            <Card>
              <Statistic title="AI reviewed" value={stats.reviewed} />
            </Card>
          </Col>
          <Col xs={12} lg={6}>
            <Card>
              <Statistic title="Paid" value={stats.paid} />
            </Card>
          </Col>
          <Col xs={12} lg={6}>
            <Card>
              <Statistic title="Reward pool" suffix="USDC" value={stats.rewards} />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={15}>
            <Card
              title="Community Bounties"
              extra={<Tag color="teal">MVP local state</Tag>}
            >
              <Table
                columns={columns}
                dataSource={bounties}
                pagination={false}
                rowKey="id"
              />
            </Card>
          </Col>
          <Col xs={24} xl={9}>
            <Card title="Create bounty">
              <Form layout="vertical" onFinish={addBounty}>
                <Form.Item
                  label="Task title"
                  name="title"
                  rules={[{ required: true, message: "Add a bounty title" }]}
                >
                  <Input placeholder="Review a beginner Solidity guide" />
                </Form.Item>
                <Form.Item
                  label="Community"
                  name="community"
                  rules={[{ required: true, message: "Add a community name" }]}
                >
                  <Select
                    options={[
                      { value: "HackQuest Learners" },
                      { value: "Campus Web3 Club" },
                      { value: "AI Builders Guild" },
                      { value: "Local Market Builders" },
                    ]}
                    placeholder="Select community"
                  />
                </Form.Item>
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
                <Form.Item
                  label="Reward"
                  name="reward"
                  rules={[{ required: true, message: "Add a USDC reward" }]}
                >
                  <InputNumber
                    addonAfter="USDC"
                    className="!w-full"
                    min={1}
                    max={50}
                  />
                </Form.Item>
                <Button block htmlType="submit" type="primary">
                  Create bounty
                </Button>
              </Form>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={14}>
            <Card
              title={selectedBounty.title}
              extra={<Tag color={statusColor(selectedBounty.status)}>{selectedBounty.status}</Tag>}
            >
              <Space direction="vertical" size="large" className="w-full">
                <Alert
                  message="Main demo flow"
                  description="Learner submits work, Venice AI reviews it, the admin approves, then a MetaMask Smart Account sends the USDC reward through 1Shot."
                  type="info"
                  showIcon
                />

                {selectedBounty.resources ? (
                  <Card size="small" title="Bounty resources">
                    <Paragraph className="!mb-0 whitespace-pre-line !text-slate-600">
                      {selectedBounty.resources}
                    </Paragraph>
                  </Card>
                ) : null}

                <Form layout="vertical" onFinish={submitWork}>
                  <Row gutter={12}>
                    <Col xs={24} md={10}>
                      <Form.Item
                        label="Learner wallet"
                        name="learner"
                        rules={[{ required: true, message: "Add learner wallet" }]}
                      >
                        <Input placeholder="0x..." />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={14}>
                      <Form.Item
                        label="Submission link"
                        name="submission"
                        rules={[{ required: true, message: "Add proof link" }]}
                      >
                        <Input placeholder="GitHub, demo, article, or video URL" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Button htmlType="submit">Submit work</Button>
                </Form>

                <Divider />

                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <Card size="small" title="Venice AI review">
                      <Space direction="vertical" className="w-full">
                        <Progress
                          percent={selectedBounty.aiScore ?? 0}
                          strokeColor="#0f766e"
                        />
                        <Text>
                          Recommendation:{" "}
                          <Text strong>
                            {selectedBounty.aiRecommendation ?? "Not reviewed"}
                          </Text>
                        </Text>
                        <Paragraph className="!mb-0 !text-slate-600">
                          {selectedBounty.aiSummary ??
                            "Run Venice review after a learner submits work."}
                        </Paragraph>
                        {selectedBounty.aiStrengths?.length ? (
                          <Text className="!text-slate-600">
                            Strengths: {selectedBounty.aiStrengths.join(", ")}
                          </Text>
                        ) : null}
                        {selectedBounty.aiIssues?.length ? (
                          <Text className="!text-slate-600">
                            Issues: {selectedBounty.aiIssues.join(", ")}
                          </Text>
                        ) : null}
                        <Button loading={isReviewing} onClick={runAiReview}>
                          Run Venice review
                        </Button>
                      </Space>
                    </Card>
                  </Col>
                  <Col xs={24} md={12}>
                    <Card size="small" title="Smart payout">
                      <Space direction="vertical" className="w-full">
                        <Text>
                          Reward:{" "}
                          <Text strong>
                            {selectedBounty.reward} {selectedBounty.token}
                          </Text>
                        </Text>
                        <Text>
                          Recipient:{" "}
                          <Text strong>{selectedBounty.learner ?? "Pending"}</Text>
                        </Text>
                        <Text>
                          Transaction:{" "}
                          <Text strong>
                            {selectedBounty.txHash ??
                              selectedBounty.relayTaskId ??
                              "Not paid"}
                          </Text>
                        </Text>
                        <Text>
                          Permission:{" "}
                          <Text strong>
                            {permissionGrant
                              ? `${permissionGrant.permissionContext.slice(0, 10)}...`
                              : "Not granted"}
                          </Text>
                        </Text>
                        <Text>
                          Relay:{" "}
                          <Text strong>
                            {selectedBounty.relayStatus ?? "Not prepared"}
                          </Text>
                        </Text>
                        <Button
                          disabled={!selectedBounty.learner || !permissionGrant}
                          loading={isPreparingRelay}
                          onClick={approvePayout}
                          type="primary"
                        >
                          Prepare 1Shot payout
                        </Button>
                        <Button
                          disabled={!selectedBounty.relayCalldata}
                          loading={isSubmittingRelay}
                          onClick={submitRelayTransaction}
                          type="default"
                        >
                          Submit to 1Shot
                        </Button>
                        <Button
                          disabled={!selectedBounty.relayTaskId}
                          loading={isCheckingRelay}
                          onClick={checkRelayStatus}
                        >
                          Check relay status
                        </Button>
                      </Space>
                    </Card>
                  </Col>
                </Row>
              </Space>
            </Card>
          </Col>
          <Col xs={24} xl={10}>
            <Card title="Integration map">
              <Timeline
                items={[
                  {
                    color: "green",
                    children:
                      "MetaMask: connect admin wallet and request Advanced Permission or create a smart account.",
                  },
                  {
                    color: "green",
                    children:
                      "Venice: score the learner submission and return structured JSON for the admin.",
                  },
                  {
                    color: "blue",
                    children:
                      "1Shot: quote and relay the ERC-7710 USDC transfer so the payout avoids native gas friction.",
                  },
                  {
                    color: "gray",
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
                    : selectedBounty.status === "AI Reviewed"
                      ? 2
                      : selectedBounty.status === "Submitted"
                        ? 1
                        : 0
                }
                direction="vertical"
                items={[
                  { title: "Bounty posted" },
                  { title: "Work submitted" },
                  { title: "AI reviewed" },
                  { title: "Paid through smart account" },
                ]}
              />
            </Card>
          </Col>
        </Row>
      </div>
    </main>
  );
}
