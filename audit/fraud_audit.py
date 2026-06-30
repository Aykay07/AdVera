import argparse
import sys
import pandas as pd
import requests

BACKEND_URL = "http://localhost:4000"

def fetch_batches():
    resp = requests.get(f"{BACKEND_URL}/api/batches", timeout=5)
    resp.raise_for_status()
    data = resp.json()
    if not data:
        print("No batches found yet — run the simulator and wait for the next batch window.")
        sys.exit(0)
    df = pd.DataFrame(data)
    df["timestamp"] = pd.to_datetime(df["timestamp"], unit="s")
    return df

def build_report(df):
    df = df.copy()
    df["discrepancy"] = (df["publisherCount"] - df["advertiserCount"]).abs()
    df["clawback_pct"] = df["penaltyBasisPoints"] / 100.0
    df["likely_fraud"] = df["status"] == "Disputed"
    return df.sort_values("timestamp", ascending=False)

def print_summary(df):
    print("\n=== ClearAd Independent Audit Summary ===")
    print(f"Batches reviewed : {len(df)}")
    print(f"Verified (clean) : {int((df['status'] == 'Verified').sum())}")
    print(f"Disputed (fraud) : {int((df['status'] == 'Disputed').sum())}")
    flagged = df[df["status"] == "Disputed"]
    if not flagged.empty:
        print("\nFlagged batches:")
        for _, row in flagged.iterrows():
            print(f"  batch {row['batchId']} | campaign {row['campaignId']} | "
                  f"adv={row['advertiserCount']} pub={row['publisherCount']} | "
                  f"variance={row['variancePct']:.2f}% | clawback={row['clawback_pct']:.2f}%")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=None)
    args = parser.parse_args()

    raw = fetch_batches()
    report = build_report(raw)
    print_summary(report)
    if args.out:
        report.to_csv(args.out, index=False)
        print(f"\nFull report written to {args.out}")
