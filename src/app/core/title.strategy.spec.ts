import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppTitleStrategy } from './title.strategy';

describe('AppTitleStrategy', () => {
  let strategy: AppTitleStrategy;
  let titleService: Title;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AppTitleStrategy, Title],
    });

    strategy = TestBed.inject(AppTitleStrategy);
    titleService = TestBed.inject(Title);
  });

  it('updates title with page title suffix when page title exists', () => {
    const setTitleSpy = vi.spyOn(titleService, 'setTitle');
    vi.spyOn(strategy, 'buildTitle').mockReturnValue('Tickets');

    const fakeSnapshot = {} as RouterStateSnapshot;
    strategy.updateTitle(fakeSnapshot);

    expect(setTitleSpy).toHaveBeenCalledWith('Tickets · SupportHub');
  });

  it('sets base title "SupportHub" when page title is empty or undefined', () => {
    const setTitleSpy = vi.spyOn(titleService, 'setTitle');
    vi.spyOn(strategy, 'buildTitle').mockReturnValue(undefined);

    const fakeSnapshot = {} as RouterStateSnapshot;
    strategy.updateTitle(fakeSnapshot);

    expect(setTitleSpy).toHaveBeenCalledWith('SupportHub');
  });
});
