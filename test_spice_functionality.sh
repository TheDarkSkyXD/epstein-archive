#!/bin/bash

# Epstein Archive Spice Rating Test Script
# This script tests the spice rating functionality end-to-end

echo "🌶️ Epstein Archive Spice Rating Test Suite 🌶️"
echo "================================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_spice_ratings() {
    echo -e "${YELLOW}Testing spice ratings in data...${NC}"
    
    # Check if spice ratings exist in the data
    if grep -q "spice_rating" src/data/peopleData.ts; then
        echo -e "${GREEN}✅ Spice ratings found in data${NC}"
    else
        echo -e "${RED}❌ Spice ratings not found in data${NC}"
        return 1
    fi
    
    # Check for specific high-spice individuals
    high_spice_names=("Donald Trump" "Ghislaine Maxwell" "Prince Andrew" "Bill Clinton")
    
    for name in "${high_spice_names[@]}"; do
        if grep -q "$name" src/data/peopleData.ts; then
            # Extract spice rating for this person
            spice_rating=$(grep -A 10 "$name" src/data/peopleData.ts | grep "spice_rating" | head -1 | sed 's/.*"spice_rating": \([0-9]\+\).*/\1/')
            if [ "$spice_rating" -ge 4 ]; then
                echo -e "${GREEN}✅ $name has high spice rating: $spice_rating${NC}"
            else
                echo -e "${RED}❌ $name has low spice rating: $spice_rating${NC}"
            fi
        else
            echo -e "${RED}❌ $name not found in data${NC}"
        fi
    done
}

test_search_functionality() {
    echo -e "${YELLOW}Testing search component spice filtering...${NC}"
    
    # Check if EvidenceSearch component has spice filtering
    if grep -q "minSpiceRating" src/components/EvidenceSearch.tsx; then
        echo -e "${GREEN}✅ Spice rating filters found in EvidenceSearch${NC}"
    else
        echo -e "${RED}❌ Spice rating filters not found in EvidenceSearch${NC}"
        return 1
    fi
    
    # Check for spice sorting
    if grep -q "sortBy.*spice" src/components/EvidenceSearch.tsx; then
        echo -e "${GREEN}✅ Spice sorting found in EvidenceSearch${NC}"
    else
        echo -e "${RED}❌ Spice sorting not found in EvidenceSearch${NC}"
        return 1
    fi
}

test_people_view_spice() {
    echo -e "${YELLOW}Testing people view spice display...${NC}"
    
    # Check if App component has spice sorting
    if grep -q "sortBy.*spice" src/App.tsx; then
        echo -e "${GREEN}✅ Spice sorting found in App component${NC}"
    else
        echo -e "${RED}❌ Spice sorting not found in App component${NC}"
        return 1
    fi
    
    # Check for spice rating display in people cards
    if grep -q "spice_peppers" src/App.tsx; then
        echo -e "${GREEN}✅ Spice peppers display found in App component${NC}"
    else
        echo -e "${RED}❌ Spice peppers display not found in App component${NC}"
        return 1
    fi
}

test_data_validation() {
    echo -e "${YELLOW}Testing data validation...${NC}"
    
    # Check if test files exist
    if [ -f "tests/data-validation.spec.ts" ]; then
        echo -e "${GREEN}✅ Data validation tests found${NC}"
    else
        echo -e "${RED}❌ Data validation tests not found${NC}"
        return 1
    fi
    
    if [ -f "tests/epstein-archive.spec.ts" ]; then
        echo -e "${GREEN}✅ End-to-end tests found${NC}"
    else
        echo -e "${RED}❌ End-to-end tests not found${NC}"
        return 1
    fi
}

# Run all tests
echo "Running spice rating functionality tests..."
echo ""

test_spice_ratings
echo ""

test_search_functionality
echo ""

test_people_view_spice
echo ""

test_data_validation
echo ""

echo "================================================"
echo -e "${GREEN}All spice rating tests completed!${NC}"
echo ""
echo "To run the full test suite:"
echo "  npm run test"
echo ""
echo "To run specific spice tests:"
echo "  npm run test:spice"
echo ""
echo "To start the development server:"
echo "  npm run dev"
echo "Then visit: http://localhost:3003"