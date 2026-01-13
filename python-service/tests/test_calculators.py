import pytest
from calculators import california, texas, wyoming, florida, new_york, washington


class TestCaliforniaCalculator:
    def test_basic_calculation(self):
        earnings = [15000, 15000, 15000, 15000]
        result = california.calculate(earnings)

        # 15000 / 26 = 576.92, capped at 450
        assert result.weekly_benefit_amount == 450
        assert result.max_duration_weeks == 26
        assert result.total_potential == 450 * 26

    def test_below_max(self):
        earnings = [10000, 10000, 10000, 10000]
        result = california.calculate(earnings)

        # 10000 / 26 = 384.62
        assert result.weekly_benefit_amount == pytest.approx(384.62, rel=0.01)
        assert result.max_duration_weeks == 26

    def test_minimum_benefit(self):
        earnings = [500, 500, 500, 500]
        result = california.calculate(earnings)

        # 500 / 26 = 19.23, raised to min 40
        assert result.weekly_benefit_amount == 40

    def test_uses_highest_quarter(self):
        earnings = [20000, 10000, 10000, 10000]
        result = california.calculate(earnings)

        # Should use 20000 as high quarter
        # 20000 / 26 = 769.23, capped at 450
        assert result.weekly_benefit_amount == 450


class TestTexasCalculator:
    def test_basic_calculation(self):
        earnings = [14000, 14000, 14000, 14000]
        result = texas.calculate(earnings)

        # 14000 / 25 = 560
        assert result.weekly_benefit_amount == pytest.approx(560, rel=0.01)

    def test_max_cap(self):
        earnings = [20000, 20000, 20000, 20000]
        result = texas.calculate(earnings)

        # 20000 / 25 = 800, capped at 577
        assert result.weekly_benefit_amount == 577


class TestWyomingCalculator:
    def test_basic_calculation(self):
        earnings = [15000, 15000, 15000, 15000]
        result = wyoming.calculate(earnings)

        # 60000 * 0.04 = 2400, capped at 560
        assert result.weekly_benefit_amount == 560

    def test_below_max(self):
        earnings = [3000, 3000, 3000, 3000]
        result = wyoming.calculate(earnings)

        # 12000 * 0.04 = 480
        assert result.weekly_benefit_amount == pytest.approx(480, rel=0.01)


class TestFloridaCalculator:
    def test_basic_calculation(self):
        earnings = [10000, 10000, 10000, 10000]
        result = florida.calculate(earnings)

        # 10000 / 26 = 384.62, capped at 275
        assert result.weekly_benefit_amount == 275

    def test_weeks_vary_by_earnings(self):
        # High earner gets more weeks
        high_earner = [20000, 20000, 20000, 20000]
        result_high = florida.calculate(high_earner)
        assert result_high.max_duration_weeks == 23

        # Low earner gets fewer weeks
        low_earner = [5000, 5000, 5000, 5000]
        result_low = florida.calculate(low_earner)
        assert result_low.max_duration_weeks == 12


class TestNewYorkCalculator:
    def test_basic_calculation(self):
        earnings = [12000, 12000, 12000, 12000]
        result = new_york.calculate(earnings)

        # 12000 / 26 = 461.54
        assert result.weekly_benefit_amount == pytest.approx(461.54, rel=0.01)

    def test_max_cap(self):
        earnings = [20000, 20000, 20000, 20000]
        result = new_york.calculate(earnings)

        # 20000 / 26 = 769.23, capped at 504
        assert result.weekly_benefit_amount == 504


class TestWashingtonCalculator:
    def test_basic_calculation(self):
        earnings = [20000, 20000, 20000, 20000]
        result = washington.calculate(earnings)

        # 20000 / 25 = 800
        assert result.weekly_benefit_amount == pytest.approx(800, rel=0.01)

    def test_high_earner_below_max(self):
        earnings = [24000, 24000, 24000, 24000]
        result = washington.calculate(earnings)

        # 24000 / 25 = 960, below max of 999
        assert result.weekly_benefit_amount == pytest.approx(960, rel=0.01)

    def test_max_cap(self):
        earnings = [30000, 30000, 30000, 30000]
        result = washington.calculate(earnings)

        # 30000 / 25 = 1200, capped at 999
        assert result.weekly_benefit_amount == 999


class TestEdgeCases:
    def test_insufficient_quarters_raises_error(self):
        with pytest.raises(ValueError):
            california.calculate([15000, 15000])

    def test_zero_earnings(self):
        result = california.calculate([0, 0, 0, 0])
        # Should return minimum benefit
        assert result.weekly_benefit_amount == 40

    def test_mixed_quarters(self):
        earnings = [25000, 5000, 10000, 15000]
        result = california.calculate(earnings)

        # Should use 25000 as high quarter
        # 25000 / 26 = 961.54, capped at 450
        assert result.weekly_benefit_amount == 450
