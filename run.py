import subprocess
import sys
import os
import signal

ROOT = os.path.dirname(os.path.abspath(__file__))


def main():
    procs = []

    try:
        # Start backend
        backend = subprocess.Popen(
            [
                sys.executable, "-m", "uvicorn",
                "backend.main:app",
                "--reload",
                "--port", "8005",
            ],
            cwd=ROOT,
        )
        procs.append(backend)

        # Start frontend
        frontend = subprocess.Popen(
            ["npm", "run", "dev"],
            cwd=os.path.join(ROOT, "frontend"),
        )
        procs.append(frontend)

        print("Backend:  http://localhost:8005")
        print("Frontend: http://localhost:8081")
        print("Press Ctrl+C to stop both.\n")

        # Wait for either to exit
        for p in procs:
            p.wait()

    except KeyboardInterrupt:
        print("\nShutting down...")
        for p in procs:
            p.send_signal(signal.SIGTERM)
        for p in procs:
            p.wait()


if __name__ == "__main__":
    main()
