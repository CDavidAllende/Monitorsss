import { ScrapeResult } from './scraper';
import { MonitorRow } from './check-monitor';

export interface RuleEvaluation {
  matched: boolean;
  changed: boolean;
  reason: string;
}

export function evaluateRule(
  ruleType: MonitorRow['rule_type'],
  ruleConfig: Record<string, any>,
  scrapeResult: ScrapeResult,
  monitor: MonitorRow
): RuleEvaluation {
  switch (ruleType) {
    case 'hash_diff':
      return evaluateHashDiff(scrapeResult, monitor);
    case 'text_contains':
    case 'text_not_contains':
      return evaluateTextContains(
        scrapeResult,
        ruleConfig as { text: string; negate?: boolean },
        monitor,
        ruleType === 'text_not_contains'
      );
    case 'price_threshold':
      return evaluatePriceThreshold(
        scrapeResult,
        ruleConfig as { operator: 'lt' | 'lte' | 'gt' | 'gte'; value: number },
        monitor
      );
    case 'availability':
      return evaluateAvailability(
        scrapeResult,
        ruleConfig as { expect: 'in_stock' | 'out_of_stock'; map: Record<string, string[]> },
        monitor
      );
    default:
      return evaluateHashDiff(scrapeResult, monitor);
  }
}

function evaluateHashDiff(result: ScrapeResult, monitor: MonitorRow): RuleEvaluation {
  const matched = monitor.last_hash !== null && monitor.last_hash !== result.contentHash;
  return { matched, changed: matched, reason: matched ? 'Contenido modificado' : 'Sin cambios' };
}

function evaluatePriceThreshold(
  result: ScrapeResult,
  config: { operator: 'lt' | 'lte' | 'gt' | 'gte'; value: number },
  monitor: MonitorRow
): RuleEvaluation {
  if (result.extractedValue === null) {
    return { matched: false, changed: false, reason: 'Sin valor extraído' };
  }

  const matched = compareThreshold(result.extractedValue, config.operator, config.value);
  const changed = monitor.last_rule_matched !== null && monitor.last_rule_matched !== matched && matched === true;

  return {
    matched,
    changed,
    reason: matched
      ? `Precio ${result.extractedValue} cumple ${config.operator} ${config.value}`
      : `Precio ${result.extractedValue} no cumple la condición`,
  };
}

function compareThreshold(value: number, operator: string, threshold: number): boolean {
  switch (operator) {
    case 'lt': return value < threshold;
    case 'lte': return value <= threshold;
    case 'gt': return value > threshold;
    case 'gte': return value >= threshold;
    default: return false;
  }
}

function evaluateTextContains(
  result: ScrapeResult,
  config: { text: string; negate?: boolean },
  monitor: MonitorRow,
  forceNegate = false
): RuleEvaluation {
  const found = result.textContent.toLowerCase().includes(config.text.toLowerCase());
  const negate = forceNegate || config.negate;
  const matched = negate ? !found : found;
  const changed = monitor.last_rule_matched !== null && monitor.last_rule_matched !== matched && matched === true;

  return { matched, changed, reason: matched ? `Texto "${config.text}" detectado` : 'Condición no cumplida' };
}

function evaluateAvailability(
  result: ScrapeResult,
  config: { expect: 'in_stock' | 'out_of_stock'; map: Record<string, string[]> },
  monitor: MonitorRow
): RuleEvaluation {
  const text = result.textContent.toLowerCase();
  const keywords = config.map[config.expect] ?? [];
  const matched = keywords.some((kw) => text.includes(kw.toLowerCase()));
  const changed = monitor.last_rule_matched !== null && monitor.last_rule_matched !== matched && matched === true;

  return { matched, changed, reason: matched ? `Estado "${config.expect}" detectado` : 'Estado no coincide' };
}