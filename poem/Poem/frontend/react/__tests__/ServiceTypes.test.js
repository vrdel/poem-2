import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { createMemoryHistory } from 'history';
import { Route, Router } from 'react-router-dom';
import { ServiceTypesList } from '../ServiceTypes';
import { Backend } from '../DataManager';


jest.mock('../DataManager', () => {
  return {
    Backend: jest.fn()
  }
})


beforeEach(() => {
  jest.clearAllMocks();
})


const mockServTypes = [
  {
    name: 'argo.api',
    description: 'ARGO API service for retrieving status and A/R results.'
  },
  {
    name: 'argo.computeengine',
    description: 'ARGO Compute Engine computes availability and reliability of services.'
  },
  {
    name: 'argo.consumer',
    description: 'ARGO Consumer collects monitoring metrics from monitoring engines.'
  },
  {
    name: 'argo.mon',
    description: 'ARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.'
  },
  {
    name: 'argo.poem',
    description: 'POEM is system for managing profiles of probes and metrics in ARGO system.'
  },
  {
    name: 'argo.webui',
    description: 'ARGO web user interface for metric A/R visualization and recalculation management.'
  }
];


function renderView(publicView=undefined) {
  const route = `/ui/${publicView ? 'public_' : ''}servicetypes`;
  const history = createMemoryHistory({ initialEntries: [route] });

  if (publicView)
    return {
      ...render(
        <Router history={history}>
          <Route
            render={ props => <ServiceTypesList {...props} publicView={true} /> }
          />
        </Router>
      )
    }

  else
    return {
      ...render(
        <Router history={history}>
          <Route
            path='/ui/servicetypes/'
            component={ServiceTypesList}
          />
        </Router>
      )
    }
}


describe('Test service types list', () => {
  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: () => Promise.resolve(mockServTypes)
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /service/i }).textContent).toBe('Services types');
    })

    expect(screen.getAllByRole('columnheader')).toHaveLength(6);
    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Service type' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Description' })).toBeInTheDocument();

    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(17);
    expect(screen.getAllByPlaceholderText(/search/i)).toHaveLength(2);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(10);
    expect(rows[0].textContent).toBe('# Service typeDescription');
    // row 1 is the one with search fields
    expect(rows[2].textContent).toBe('1argo.apiARGO API service for retrieving status and A/R results.')
    expect(rows[3].textContent).toBe('2argo.computeengineARGO Compute Engine computes availability and reliability of services.');
    expect(rows[4].textContent).toBe('3argo.consumerARGO Consumer collects monitoring metrics from monitoring engines.')
    expect(rows[5].textContent).toBe('4argo.monARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.');
    expect(rows[6].textContent).toBe('5argo.poemPOEM is system for managing profiles of probes and metrics in ARGO system.')
    expect(rows[7].textContent).toBe('6argo.webuiARGO web user interface for metric A/R visualization and recalculation management.')
  })

  test('Test filtering service types', async () => {
    renderView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /service/i }).textContent).toBe('Services types');
    })

    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(10);
    const searchFields = screen.getAllByPlaceholderText(/search/i);

    fireEvent.change(searchFields[0], { target: { value: 'co' } });
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(13);
    expect(screen.getByRole('row', { name: /1/ }).textContent).toBe('1argo.computeengineARGO Compute Engine computes availability and reliability of services.')
    expect(screen.getByRole('row', { name: /2/ }).textContent).toBe('2argo.consumerARGO Consumer collects monitoring metrics from monitoring engines.')
    expect(screen.queryByRole('row', { name: /3/ })).not.toBeInTheDocument();

    fireEvent.change(searchFields[1], { target: { value: 'monitor' } })
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(14);
    expect(screen.getByRole('row', { name: /1/ }).textContent).toBe('1argo.consumerARGO Consumer collects monitoring metrics from monitoring engines.')
    expect(screen.queryByRole('row', { name: /2/ })).not.toBeInTheDocument();
  })

  test('Test that public page renders properly', async () => {
    renderView(true);

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /service/i }).textContent).toBe('Services types');
    })

    expect(screen.getAllByRole('columnheader')).toHaveLength(6);
    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Service type' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Description' })).toBeInTheDocument();

    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(17);
    expect(screen.getAllByPlaceholderText(/search/i)).toHaveLength(2);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(10);
    expect(rows[0].textContent).toBe('# Service typeDescription');
    // row 1 is the one with search fields
    expect(rows[2].textContent).toBe('1argo.apiARGO API service for retrieving status and A/R results.')
    expect(rows[3].textContent).toBe('2argo.computeengineARGO Compute Engine computes availability and reliability of services.');
    expect(rows[4].textContent).toBe('3argo.consumerARGO Consumer collects monitoring metrics from monitoring engines.')
    expect(rows[5].textContent).toBe('4argo.monARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.');
    expect(rows[6].textContent).toBe('5argo.poemPOEM is system for managing profiles of probes and metrics in ARGO system.')
    expect(rows[7].textContent).toBe('6argo.webuiARGO web user interface for metric A/R visualization and recalculation management.')
  })

  test('Test filtering public service types', async () => {
    renderView(true);

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /service/i }).textContent).toBe('Services types');
    })

    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(10);
    const searchFields = screen.getAllByPlaceholderText(/search/i);

    fireEvent.change(searchFields[0], { target: { value: 'co' } });
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(13);
    expect(screen.getByRole('row', { name: /1/ }).textContent).toBe('1argo.computeengineARGO Compute Engine computes availability and reliability of services.')
    expect(screen.getByRole('row', { name: /2/ }).textContent).toBe('2argo.consumerARGO Consumer collects monitoring metrics from monitoring engines.')
    expect(screen.queryByRole('row', { name: /3/ })).not.toBeInTheDocument();

    fireEvent.change(searchFields[1], { target: { value: 'monitor' } })
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(14);
    expect(screen.getByRole('row', { name: /1/ }).textContent).toBe('1argo.consumerARGO Consumer collects monitoring metrics from monitoring engines.')
    expect(screen.queryByRole('row', { name: /2/ })).not.toBeInTheDocument();
  })
})