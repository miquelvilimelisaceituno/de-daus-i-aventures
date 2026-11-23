import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CampaignConfig } from './campaign-config';

describe('CampaignConfig', () => {
  let component: CampaignConfig;
  let fixture: ComponentFixture<CampaignConfig>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CampaignConfig],
    }).compileComponents();

    fixture = TestBed.createComponent(CampaignConfig);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
