import '@testing-library/jest-dom/extend-expect';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from "react";
import { Route, Router } from 'react-router-dom';
import { APIKeyChange, APIKeyList } from '../APIKey';
import { Backend } from '../DataManager';
import { NotificationManager } from 'react-notifications';

function renderWithRouterMatch(
  ui,
  {
    path = "/",
    route = "/",
    history = createMemoryHistory({ initialEntries: [route] })
  } = {}
) {
  return {
    ...render(
      <Router history={history}>
        <Route path={path} component={ui} />
      </Router>
    )
  };
}

function renderAddview() {
  const history = createMemoryHistory();

  return {
    ...render(
      <Router history={history}>
        <Route render={props => <APIKeyChange {...props} addview={true} />} />
      </Router>
    )
  }
}


const mockAPIKeys = [
  {
    id: 1,
    name: 'FIRST_TOKEN',
    created: '2020-11-09 13:00:00',
    revoked: false
  },
  {
    id: 2,
    name: 'SECOND_TOKEN',
    created: '2020-11-09 13:10:01',
    revoked: false
  }
];

const mockChangeObject = jest.fn();
const mockAddObject = jest.fn();
const mockDeleteObject = jest.fn();

jest.mock('../DataManager', () => {
  return {
    Backend: jest.fn().mockImplementation(() => {
      return {
        fetchData: () => Promise.resolve(mockAPIKeys)
      }
    })
  }
})

Object.assign(navigator, {
  clipboard: {
    writeText: () => {},
  },
});

afterEach(() => {
  jest.clearAllMocks();
})

describe("Tests for API keys listview", () => {
  it('Render properly', async () => {
    renderWithRouterMatch(APIKeyList)

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', {name: /api/i}).textContent).toBe('Select API key to change')
    })
    expect(screen.getAllByRole('columnheader')).toHaveLength(4)
    expect(screen.getByRole('columnheader', {name: /name/i}).textContent).toBe('Name')
    expect(screen.getByRole('columnheader', {name: /#/i}).textContent).toBe('#')
    expect(screen.getByRole('columnheader', {name: /created/i}).textContent).toBe('Created')
    expect(screen.getByRole('columnheader', {name: /revoked/i}).textContent).toBe('Revoked')
    expect(screen.getAllByRole('row')).toHaveLength(6)
    expect(screen.getAllByRole('row', {name: ''})).toHaveLength(3)
    expect(screen.getAllByRole('row', {name: /token/i})).toHaveLength(2)
    expect(screen.getByRole('row', {name: /first_token/i}).textContent).toBe('1FIRST_TOKEN2020-11-09 13:00:00')
    expect(screen.getByRole('row', {name: /second_token/i}).textContent).toBe('2SECOND_TOKEN2020-11-09 13:10:01')
    expect(screen.getByRole('link', {name: /first/i})).toHaveProperty('href', 'http://localhost/ui/administration/apikey/FIRST_TOKEN')
    expect(screen.getByRole('link', {name: /second/i})).toHaveProperty('href', 'http://localhost/ui/administration/apikey/SECOND_TOKEN')
    expect(screen.getByRole('button', {name: 'Add'})).toBeTruthy()
  })

  it('Render empty table properly', async () => {
    Backend.mockImplementation(() => {
      return {
        fetchData: () => Promise.resolve([])
      }
    })

    renderWithRouterMatch(APIKeyList)

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', {name: /api/i}).textContent).toBe('Select API key to change')
    })
    expect(screen.getAllByRole('columnheader')).toHaveLength(4)
    expect(screen.getByRole('columnheader', {name: /name/i}).textContent).toBe('Name')
    expect(screen.getByRole('columnheader', {name: /#/i}).textContent).toBe('#')
    expect(screen.getByRole('columnheader', {name: /created/i}).textContent).toBe('Created')
    expect(screen.getByRole('columnheader', {name: /revoked/i}).textContent).toBe('Revoked')
    expect(screen.getAllByRole('row')).toHaveLength(6)
    expect(screen.getAllByRole('row', {name: ''})).toHaveLength(4)
    expect(screen.getByRole('row', {name: /no/i}).textContent).toBe('No API keys')
    expect(screen.getByRole('button', {name: 'Add'})).toBeTruthy()
  })
})

describe('Tests for API key change', () => {
  jest.spyOn(navigator.clipboard, "writeText");
  jest.spyOn(NotificationManager, "success");
  jest.spyOn(NotificationManager, "error");
  beforeAll(() => {
    const mockAPIKey = {
      id: 1,
      name: 'FIRST_TOKEN',
      token: '123456',
      created: '2020-11-09 13:00:00',
      revoked: false
    };

    Backend.mockImplementation(() => {
      return {
        fetchData: () => Promise.resolve(mockAPIKey),
        changeObject: mockChangeObject,
        deleteObject: mockDeleteObject
      }
    })
  })

  it('Test that page renders properly', async () => {
    renderWithRouterMatch(APIKeyChange)

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', {name: /api/i}).textContent).toBe('Change API key')
    });
    expect(screen.getByRole('heading', {name: /credent/i}).textContent).toBe('Credentials')
    expect(screen.getByRole('textbox', {name: /name/i}).value).toBe('FIRST_TOKEN');
    expect(screen.getByRole('checkbox', {name: /revoked/i}).value).toBe('false');
    expect(screen.getByDisplayValue(/123/i).value).toBe('123456');
    expect(screen.getByDisplayValue(/123/i)).toBeDisabled();
    expect(screen.getByRole('button', {name: /save/i})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: /delete/i})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: ''})).toBeInTheDocument();
  })

  it('Test copy to clipbord button', async () => {
    renderWithRouterMatch(APIKeyChange)

    await waitFor(() => {
      expect(screen.getByRole('button', {name: ''})).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', {name: ''}))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('123456')
  })

  it('Test change API key name and save', async () => {
    mockChangeObject.mockReturnValue(Promise.resolve({ok: true, status_code: 200}));

    renderWithRouterMatch(APIKeyChange)

    await waitFor(() => {
      expect(screen.getByRole('button', {name: /save/i})).toBeInTheDocument()
    })
    fireEvent.change(screen.getByRole('textbox', {name: /name/i}), {target: {value: 'NEW_NAME'}})
    fireEvent.click(screen.getByRole('button', {name: /save/i}))
    await waitFor(() => {
      expect(screen.getByRole('dialog', {title: /change/i})).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', {name: /yes/i}))
    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/apikeys/',
        {id: 1, revoked: false, name: 'NEW_NAME'}
      )
    })
    expect(NotificationManager.success).toHaveBeenCalledWith('API key successfully changed', 'Changed', 2000)
  })

  it('Test revoke API key and save', async () => {
    mockChangeObject.mockReturnValue(Promise.resolve({ok: true, status: 200}));

    renderWithRouterMatch(APIKeyChange)

    await waitFor(() => {
      expect(screen.getByRole('button', {name: /save/i})).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('checkbox', {name: /revoked/i}))
    fireEvent.click(screen.getByRole('button', {name: /save/i}))
    await waitFor(() => {
      expect(screen.getByRole('dialog', {title: /change/i})).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', {name: /yes/i}))
    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/apikeys/',
        {id: 1, revoked: true, name: 'FIRST_TOKEN'}
      )
    })
    expect(NotificationManager.success).toHaveBeenCalledWith('API key successfully changed', 'Changed', 2000)
  })

  it('Test change API key with backend error message', async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({detail: 'API key with this name already exists'}),
        status: 400,
        statusText: 'BAD REQUEST'
      })
    )

    renderWithRouterMatch(APIKeyChange)

    await waitFor(() => {
      expect(screen.getByRole('button', {name: /save/i})).toBeInTheDocument();
    })
    fireEvent.change(screen.getByRole('textbox', {name: /name/i}), {target: {value: 'SECOND_TOKEN'}})
    fireEvent.click(screen.getByRole('button', {name: /save/i}))
    await waitFor(() => {
      expect(screen.getByRole('dialog', {title: /change/i})).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', {name: /yes/i}))
    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/apikeys/',
        {id: 1, revoked: false, name: 'SECOND_TOKEN'}
      )
    })
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>API key with this name already exists</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error: 400 BAD REQUEST',
      0,
      expect.any(Function)
    )
  })

  it('Test change API key with backend error without message', async () => {
    mockChangeObject.mockReturnValue(
      Promise.resolve({
        status: 500,
        statusText: 'SERVER ERROR'
      })
    )

    renderWithRouterMatch(APIKeyChange)

    await waitFor(() => {
      expect(screen.getByRole('button', {name: /save/i})).toBeInTheDocument();
    })
    fireEvent.change(screen.getByRole('textbox', {name: /name/i}), {target: {value: 'SECOND_TOKEN'}})
    fireEvent.click(screen.getByRole('button', {name: /save/i}))
    await waitFor(() => {
      expect(screen.getByRole('dialog', {title: /change/i})).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', {name: /yes/i}))
    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/apikeys/',
        {id: 1, revoked: false, name: 'SECOND_TOKEN'}
      )
    })
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error changing API key</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error: 500 SERVER ERROR',
      0,
      expect.any(Function)
    )
  })

  test('Test API key deletion', async () => {
    mockDeleteObject.mockReturnValue(
      Promise.resolve({ok: true, status_code: 204})
    );

    renderWithRouterMatch(APIKeyChange, {
      path: '/ui/administration/apikey/:name',
      route: '/ui/administration/apikey/FIRST_TOKEN'
    })

    await waitFor(() => {
      expect(screen.getByRole('button', {name: /delete/i})).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', {name: /delete/i}))
    await waitFor(() => {
      expect(screen.getByRole('dialog', {title: /delete/i})).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', {name: /yes/i}))
    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/apikeys/FIRST_TOKEN'
      )
    })
    expect(NotificationManager.success).toHaveBeenCalledWith('API key successfully deleted', 'Deleted', 2000)
  })
})

describe('Tests for API key addview', () => {
  jest.spyOn(NotificationManager, "success");
  jest.spyOn(NotificationManager, "error");

  it ('Test that addview renders properly', () => {
    renderAddview()

    expect(screen.getByRole('heading', {name: /api/i}).textContent).toBe('Add API key')
    expect(screen.getByRole('heading', {name: /credent/i}).textContent).toBe('Credentials')
    expect(screen.getByRole('textbox', {name: /name/i}).value).toBe('');
    expect(screen.getByRole('checkbox', {name: /revoked/i}).value).toBe('false');
    expect(screen.getByRole('alert').textContent).toBe('If token field is left empty, value will be automatically generated on save.')
    expect(screen.getByTestId('token').value).toBe('');
    expect(screen.getByTestId('token')).toBeEnabled();
    expect(screen.getByRole('button', {name: /save/i})).toBeInTheDocument();
    expect(screen.queryByText(/delete/i)).not.toBeInTheDocument();
  })

  it ('Test adding new API key', async () => {
    mockAddObject.mockReturnValue(Promise.resolve({ok: true, status_code: 200}));

    Backend.mockImplementation(() => {
      return {
        addObject: mockAddObject
      }
    })

    renderAddview()

    fireEvent.change(screen.getByRole('textbox', {name: /name/i}), {target: {value: 'APIKEY'}});
    fireEvent.click(screen.getByRole('button', {name: /save/i}))

    await waitFor(() => {
      expect(screen.getByRole('dialog', {title: /add/i})).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', {name: /yes/i}))
    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/apikeys/',
        {name: 'APIKEY', token: ''}
      )
    })
    expect(NotificationManager.success).toHaveBeenCalledWith('API key successfully added', 'Added', 2000)
  })

  it ('Test adding new API key with predefined token', async () => {
    mockAddObject.mockReturnValue(Promise.resolve({ok: true, status_code: 200}));

    Backend.mockImplementation(() => {
      return {
        addObject: mockAddObject
      }
    })

    renderAddview()

    fireEvent.change(screen.getByRole('textbox', {name: /name/i}), {target: {value: 'APIKEY'}});
    fireEvent.change(screen.getByTestId('token'), {target: {value: 'token123'}})
    fireEvent.click(screen.getByRole('button', {name: /save/i}))

    await waitFor(() => {
      expect(screen.getByRole('dialog', {title: /add/i})).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', {name: /yes/i}))
    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/apikeys/',
        {name: 'APIKEY', token: 'token123'}
      )
    })
    expect(NotificationManager.success).toHaveBeenCalledWith('API key successfully added', 'Added', 2000)
  })

  it('Test add API key with backend error message', async () => {
    mockAddObject.mockReturnValueOnce(
      Promise.resolve({
        json: () => Promise.resolve({detail: 'API key with this name already exists'}),
        status: 400,
        statusText: 'BAD REQUEST'
      })
    )

    Backend.mockImplementation(() => {
      return {
        addObject: mockAddObject
      }
    })

    renderAddview()

    fireEvent.change(screen.getByRole('textbox', {name: /name/i}), {target: {value: 'APIKEY'}});
    fireEvent.change(screen.getByTestId('token'), {target: {value: 'token123'}})
    fireEvent.click(screen.getByRole('button', {name: /save/i}))

    await waitFor(() => {
      expect(screen.getByRole('dialog', {title: /add/i})).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', {name: /yes/i}))
    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/apikeys/',
        {name: 'APIKEY', token: 'token123'}
      )
    })
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>API key with this name already exists</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error: 400 BAD REQUEST',
      0,
      expect.any(Function)
    )
  })

  it('Test add API key with backend error without message', async () => {
    mockAddObject.mockReturnValueOnce(
      Promise.resolve({
        status: 500,
        statusText: 'SERVER ERROR'
      })
    )

    Backend.mockImplementation(() => {
      return {
        addObject: mockAddObject
      }
    })

    renderAddview()

    fireEvent.change(screen.getByRole('textbox', {name: /name/i}), {target: {value: 'APIKEY'}});
    fireEvent.change(screen.getByTestId('token'), {target: {value: 'token123'}})
    fireEvent.click(screen.getByRole('button', {name: /save/i}))

    await waitFor(() => {
      expect(screen.getByRole('dialog', {title: /add/i})).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', {name: /yes/i}))
    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/apikeys/',
        {name: 'APIKEY', token: 'token123'}
      )
    })
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error adding API key</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error: 500 SERVER ERROR',
      0,
      expect.any(Function)
    )
  })
})