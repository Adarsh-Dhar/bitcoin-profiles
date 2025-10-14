#!/bin/bash

# Bitcoin Profiles Contract Test Runner
# This script provides easy commands to run different types of tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command_exists clarinet; then
        print_error "Clarinet is not installed. Please install it from https://github.com/hirosystems/clarinet"
        exit 1
    fi
    
    if ! command_exists deno; then
        print_error "Deno is not installed. Please install it from https://deno.land/"
        exit 1
    fi
    
    if ! command_exists npm; then
        print_error "npm is not installed. Please install Node.js from https://nodejs.org/"
        exit 1
    fi
    
    print_success "All prerequisites are installed"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    npm install
    print_success "Dependencies installed"
}

# Run all tests
run_all_tests() {
    print_status "Running all contract tests..."
    export PATH="$HOME/.deno/bin:$PATH"
    npm run test
    print_success "All tests completed"
}

# Run tests with coverage
run_tests_with_coverage() {
    print_status "Running tests with coverage report..."
    export PATH="$HOME/.deno/bin:$PATH"
    npm run test:report
    print_success "Tests with coverage completed"
}

# Run tests in watch mode
run_tests_watch() {
    print_status "Starting tests in watch mode..."
    print_warning "Press Ctrl+C to stop watching"
    export PATH="$HOME/.deno/bin:$PATH"
    npm run test:watch
}

# Run specific test file
run_specific_test() {
    local test_file="$1"
    if [ -z "$test_file" ]; then
        print_error "Please specify a test file"
        echo "Usage: $0 test <test-file>"
        echo "Available test files:"
        echo "  - key-vending-machine.test.ts"
        echo "  - key-token.test.ts"
        echo "  - factory.test.ts"
        exit 1
    fi
    
    if [ ! -f "tests/$test_file" ]; then
        print_error "Test file tests/$test_file not found"
        exit 1
    fi
    
    print_status "Running $test_file..."
    export PATH="$HOME/.deno/bin:$PATH"
    deno test --allow-read --allow-net --no-check "tests/$test_file"
    print_success "Test $test_file completed"
}

# Run Clarinet console
run_console() {
    print_status "Starting Clarinet console..."
    print_warning "Use 'exit' to quit the console"
    clarinet console
}

# Show help
show_help() {
    echo "Bitcoin Profiles Contract Test Runner"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  install     Install dependencies"
    echo "  test        Run all tests"
    echo "  coverage    Run tests with coverage report"
    echo "  watch       Run tests in watch mode"
    echo "  specific    Run specific test file"
    echo "  console     Start Clarinet console"
    echo "  check       Check prerequisites"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 install"
    echo "  $0 test"
    echo "  $0 coverage"
    echo "  $0 specific key-vending-machine.test.ts"
    echo "  $0 console"
}

# Main script logic
main() {
    case "${1:-help}" in
        "install")
            check_prerequisites
            install_dependencies
            ;;
        "test")
            check_prerequisites
            install_dependencies
            run_all_tests
            ;;
        "coverage")
            check_prerequisites
            install_dependencies
            run_tests_with_coverage
            ;;
        "watch")
            check_prerequisites
            install_dependencies
            run_tests_watch
            ;;
        "specific")
            check_prerequisites
            install_dependencies
            run_specific_test "$2"
            ;;
        "console")
            check_prerequisites
            run_console
            ;;
        "check")
            check_prerequisites
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Run main function with all arguments
main "$@"
